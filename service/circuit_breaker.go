package service

import (
	"context"
	"fmt"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/pkg/cachex"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/ratio_setting"
	"github.com/gin-gonic/gin"
	"github.com/samber/hot"
)

const (
	circuitBreakerOpenNamespace    = "new-api:circuit_breaker:open:v1"
	circuitBreakerFailureNamespace = "new-api:circuit_breaker:failure:v1"
)

var (
	circuitBreakerOpenCacheOnce    sync.Once
	circuitBreakerOpenCache        *cachex.HybridCache[CircuitBreakerOpenState]
	circuitBreakerFailureCacheOnce sync.Once
	circuitBreakerFailureCache     *cachex.HybridCache[CircuitBreakerFailureState]
)

type CircuitBreakerFailureState struct {
	ConsecutiveFailures int   `json:"consecutive_failures"`
	LastFailureUnix     int64 `json:"last_failure_unix"`
}

type CircuitBreakerOpenState struct {
	OpenedAtUnix         int64 `json:"opened_at_unix"`
	OpenUntilUnix        int64 `json:"open_until_unix"`
	LastStatusCode       int   `json:"last_status_code"`
	ConsecutiveFailures  int   `json:"consecutive_failures"`
	CooldownSeconds      int   `json:"cooldown_seconds"`
	FailureWindowSeconds int   `json:"failure_window_seconds"`
}

type CircuitBreakerStateView struct {
	Key                  string `json:"key"`
	ChannelID            int    `json:"channel_id"`
	ChannelName          string `json:"channel_name"`
	ModelName            string `json:"model_name"`
	GroupName            string `json:"group_name"`
	LastStatusCode       int    `json:"last_status_code"`
	ConsecutiveFailures  int    `json:"consecutive_failures"`
	CooldownSeconds      int    `json:"cooldown_seconds"`
	FailureWindowSeconds int    `json:"failure_window_seconds"`
	OpenedAtUnix         int64  `json:"opened_at_unix"`
	OpenUntilUnix        int64  `json:"open_until_unix"`
	RemainingSeconds     int64  `json:"remaining_seconds"`
}

func init() {
	model.SetChannelSelectableChecker(func(channel *model.Channel, group string, modelName string) bool {
		if channel == nil {
			return false
		}
		return !IsChannelInCircuitBreakerCooldown(channel.Id, modelName, group)
	})
}

func IsCircuitBreakerEnabled() bool {
	setting := operation_setting.GetCircuitBreakerSetting()
	if setting == nil {
		return false
	}
	return setting.Enabled && setting.EffectiveCooldownSeconds() > 0 && setting.EffectiveConsecutiveFailures() > 0
}

func ShouldTriggerCircuitBreakerStatus(statusCode int) bool {
	if !IsCircuitBreakerEnabled() {
		return false
	}
	setting := operation_setting.GetCircuitBreakerSetting()
	if setting == nil {
		return statusCode == 429
	}
	return setting.IsTriggerStatusCode(statusCode)
}

func ShouldSkipChannelByCircuitBreaker(c *gin.Context, channelID int, modelName, group string) bool {
	if !IsChannelInCircuitBreakerCooldown(channelID, modelName, group) {
		return false
	}
	setting := operation_setting.GetCircuitBreakerSetting()
	if setting != nil && setting.LogSkipEvents && c != nil {
		logger.LogDebug(c, "circuit breaker skip: channel=%d, model=%s, group=%s", channelID, modelName, group)
	}
	return true
}

func IsChannelInCircuitBreakerCooldown(channelID int, modelName, group string) bool {
	if channelID <= 0 || !IsCircuitBreakerEnabled() {
		return false
	}
	setting := operation_setting.GetCircuitBreakerSetting()
	cacheKey := buildCircuitBreakerKey(channelID, modelName, group, setting)
	if cacheKey == "" {
		return false
	}
	state, found, err := getCircuitBreakerOpenCache().Get(cacheKey)
	if err != nil {
		common.SysError(fmt.Sprintf("circuit breaker open cache get failed: key=%s, err=%v", cacheKey, err))
		return false
	}
	if !found {
		return false
	}
	return state.OpenUntilUnix > time.Now().Unix()
}

func ReportCircuitBreakerFailure(c *gin.Context, channelID int, modelName, group string, statusCode int) {
	if channelID <= 0 || !ShouldTriggerCircuitBreakerStatus(statusCode) {
		return
	}
	setting := operation_setting.GetCircuitBreakerSetting()
	if setting == nil {
		return
	}
	cacheKey := buildCircuitBreakerKey(channelID, modelName, group, setting)
	if cacheKey == "" {
		return
	}

	now := time.Now().Unix()
	cooldownSeconds := setting.EffectiveCooldownSeconds()
	failureWindowSeconds := setting.EffectiveFailureWindowSeconds()

	openState, openFound, err := getCircuitBreakerOpenCache().Get(cacheKey)
	if err != nil {
		common.SysError(fmt.Sprintf("circuit breaker open cache get failed: key=%s, err=%v", cacheKey, err))
	}
	if openFound && openState.OpenUntilUnix > now {
		openState.OpenUntilUnix = now + int64(cooldownSeconds)
		openState.LastStatusCode = statusCode
		err = getCircuitBreakerOpenCache().SetWithTTL(cacheKey, openState, time.Duration(cooldownSeconds)*time.Second)
		if err != nil {
			common.SysError(fmt.Sprintf("circuit breaker open cache refresh failed: key=%s, err=%v", cacheKey, err))
		}
		return
	}

	failureState := CircuitBreakerFailureState{}
	if cachedState, found, cacheErr := getCircuitBreakerFailureCache().Get(cacheKey); cacheErr != nil {
		common.SysError(fmt.Sprintf("circuit breaker failure cache get failed: key=%s, err=%v", cacheKey, cacheErr))
	} else if found {
		failureState = cachedState
	}
	if failureWindowSeconds > 0 && now-failureState.LastFailureUnix > int64(failureWindowSeconds) {
		failureState.ConsecutiveFailures = 0
	}
	failureState.ConsecutiveFailures++
	failureState.LastFailureUnix = now

	failureTTLSeconds := maxInt(cooldownSeconds*2, failureWindowSeconds*2, 120)
	err = getCircuitBreakerFailureCache().SetWithTTL(cacheKey, failureState, time.Duration(failureTTLSeconds)*time.Second)
	if err != nil {
		common.SysError(fmt.Sprintf("circuit breaker failure cache set failed: key=%s, err=%v", cacheKey, err))
	}

	threshold := setting.EffectiveConsecutiveFailures()
	if failureState.ConsecutiveFailures < threshold {
		return
	}

	newOpenState := CircuitBreakerOpenState{
		OpenedAtUnix:         now,
		OpenUntilUnix:        now + int64(cooldownSeconds),
		LastStatusCode:       statusCode,
		ConsecutiveFailures:  failureState.ConsecutiveFailures,
		CooldownSeconds:      cooldownSeconds,
		FailureWindowSeconds: failureWindowSeconds,
	}
	err = getCircuitBreakerOpenCache().SetWithTTL(cacheKey, newOpenState, time.Duration(cooldownSeconds)*time.Second)
	if err != nil {
		common.SysError(fmt.Sprintf("circuit breaker open cache set failed: key=%s, err=%v", cacheKey, err))
		return
	}
	if _, deleteErr := getCircuitBreakerFailureCache().DeleteMany([]string{cacheKey}); deleteErr != nil {
		common.SysError(fmt.Sprintf("circuit breaker failure cache clear failed: key=%s, err=%v", cacheKey, deleteErr))
	}

	logCircuitBreakerInfo(c,
		"circuit breaker OPEN channel=%d model=%s group=%s status=%d consecutive=%d cooldown=%ds key=%s",
		channelID, strings.TrimSpace(modelName), strings.TrimSpace(group), statusCode, newOpenState.ConsecutiveFailures, cooldownSeconds, cacheKey,
	)
}

func ReportCircuitBreakerSuccess(c *gin.Context, channelID int, modelName, group string) {
	if channelID <= 0 || !IsCircuitBreakerEnabled() {
		return
	}
	setting := operation_setting.GetCircuitBreakerSetting()
	if setting == nil {
		return
	}
	cacheKey := buildCircuitBreakerKey(channelID, modelName, group, setting)
	if cacheKey == "" {
		return
	}

	now := time.Now().Unix()
	shouldLogClose := false
	if openState, found, err := getCircuitBreakerOpenCache().Get(cacheKey); err != nil {
		common.SysError(fmt.Sprintf("circuit breaker open cache get failed: key=%s, err=%v", cacheKey, err))
	} else if found {
		// Keep active cooldown untouched. A delayed success from an in-flight request
		// must not prematurely close an already opened cooldown window.
		if openState.OpenUntilUnix > now {
			return
		}
		if openState.ConsecutiveFailures > 0 {
			shouldLogClose = true
		}
	}

	if failureState, found, err := getCircuitBreakerFailureCache().Get(cacheKey); err != nil {
		common.SysError(fmt.Sprintf("circuit breaker failure cache get failed: key=%s, err=%v", cacheKey, err))
	} else if found {
		if failureState.ConsecutiveFailures > 0 {
			shouldLogClose = true
		}
	}

	if _, err := getCircuitBreakerOpenCache().DeleteMany([]string{cacheKey}); err != nil {
		common.SysError(fmt.Sprintf("circuit breaker open cache clear failed: key=%s, err=%v", cacheKey, err))
	}
	if _, err := getCircuitBreakerFailureCache().DeleteMany([]string{cacheKey}); err != nil {
		common.SysError(fmt.Sprintf("circuit breaker failure cache clear failed: key=%s, err=%v", cacheKey, err))
	}

	if shouldLogClose {
		logCircuitBreakerInfo(c,
			"circuit breaker CLOSE channel=%d model=%s group=%s key=%s",
			channelID, strings.TrimSpace(modelName), strings.TrimSpace(group), cacheKey,
		)
	}
}

func getCircuitBreakerOpenCache() *cachex.HybridCache[CircuitBreakerOpenState] {
	circuitBreakerOpenCacheOnce.Do(func() {
		circuitBreakerOpenCache = cachex.NewHybridCache[CircuitBreakerOpenState](cachex.HybridCacheConfig[CircuitBreakerOpenState]{
			Namespace: cachex.Namespace(circuitBreakerOpenNamespace),
			Redis:     common.RDB,
			RedisEnabled: func() bool {
				return common.RedisEnabled && common.RDB != nil
			},
			RedisCodec: cachex.JSONCodec[CircuitBreakerOpenState]{},
			Memory: func() *hot.HotCache[string, CircuitBreakerOpenState] {
				return hot.NewHotCache[string, CircuitBreakerOpenState](hot.LRU, 100_000).
					WithTTL(5 * time.Minute).
					WithJanitor().
					Build()
			},
		})
	})
	return circuitBreakerOpenCache
}

func getCircuitBreakerFailureCache() *cachex.HybridCache[CircuitBreakerFailureState] {
	circuitBreakerFailureCacheOnce.Do(func() {
		circuitBreakerFailureCache = cachex.NewHybridCache[CircuitBreakerFailureState](cachex.HybridCacheConfig[CircuitBreakerFailureState]{
			Namespace: cachex.Namespace(circuitBreakerFailureNamespace),
			Redis:     common.RDB,
			RedisEnabled: func() bool {
				return common.RedisEnabled && common.RDB != nil
			},
			RedisCodec: cachex.JSONCodec[CircuitBreakerFailureState]{},
			Memory: func() *hot.HotCache[string, CircuitBreakerFailureState] {
				return hot.NewHotCache[string, CircuitBreakerFailureState](hot.LRU, 100_000).
					WithTTL(10 * time.Minute).
					WithJanitor().
					Build()
			},
		})
	})
	return circuitBreakerFailureCache
}

func buildCircuitBreakerKey(channelID int, modelName, group string, setting *operation_setting.CircuitBreakerSetting) string {
	if channelID <= 0 {
		return ""
	}
	parts := []string{fmt.Sprintf("channel:%d", channelID)}

	if setting != nil && setting.ScopeByModel {
		normalizedModel := ratio_setting.FormatMatchingModelName(modelName)
		if normalizedModel == "" {
			normalizedModel = strings.TrimSpace(modelName)
		}
		if normalizedModel == "" {
			normalizedModel = "_"
		}
		parts = append(parts, "model:"+strings.ToLower(normalizedModel))
	}

	if setting != nil && setting.ScopeByGroup {
		trimmedGroup := strings.TrimSpace(group)
		if trimmedGroup == "" {
			trimmedGroup = "_"
		}
		parts = append(parts, "group:"+strings.ToLower(trimmedGroup))
	}

	return strings.Join(parts, "|")
}

func logCircuitBreakerInfo(c *gin.Context, format string, args ...any) {
	msg := fmt.Sprintf(format, args...)
	if c != nil {
		logger.LogInfo(c, msg)
		return
	}
	logger.LogInfo(context.Background(), msg)
}

func maxInt(values ...int) int {
	maxV := 0
	for i, v := range values {
		if i == 0 || v > maxV {
			maxV = v
		}
	}
	return maxV
}

func ListCircuitBreakerOpenStates() ([]CircuitBreakerStateView, error) {
	keys, err := getCircuitBreakerOpenCache().Keys()
	if err != nil {
		return nil, err
	}
	nowUnix := time.Now().Unix()
	states := make([]CircuitBreakerStateView, 0, len(keys))

	for _, key := range keys {
		openState, found, getErr := getCircuitBreakerOpenCache().Get(key)
		if getErr != nil || !found {
			continue
		}
		remaining := openState.OpenUntilUnix - nowUnix
		if remaining <= 0 {
			continue
		}

		normalizedKey := normalizeCircuitBreakerCacheKey(key)
		channelID, modelName, groupName := parseCircuitBreakerScopeKey(normalizedKey)
		channelName := ""
		if channelID > 0 {
			channel, channelErr := model.CacheGetChannel(channelID)
			if channelErr == nil && channel != nil {
				channelName = channel.Name
			}
		}

		states = append(states, CircuitBreakerStateView{
			Key:                  normalizedKey,
			ChannelID:            channelID,
			ChannelName:          channelName,
			ModelName:            modelName,
			GroupName:            groupName,
			LastStatusCode:       openState.LastStatusCode,
			ConsecutiveFailures:  openState.ConsecutiveFailures,
			CooldownSeconds:      openState.CooldownSeconds,
			FailureWindowSeconds: openState.FailureWindowSeconds,
			OpenedAtUnix:         openState.OpenedAtUnix,
			OpenUntilUnix:        openState.OpenUntilUnix,
			RemainingSeconds:     remaining,
		})
	}

	sort.Slice(states, func(i, j int) bool {
		if states[i].RemainingSeconds == states[j].RemainingSeconds {
			return states[i].ChannelID < states[j].ChannelID
		}
		return states[i].RemainingSeconds > states[j].RemainingSeconds
	})

	return states, nil
}

func normalizeCircuitBreakerCacheKey(key string) string {
	key = strings.TrimSpace(key)
	if key == "" {
		return ""
	}
	return strings.TrimPrefix(key, circuitBreakerOpenNamespace+":")
}

func parseCircuitBreakerScopeKey(key string) (int, string, string) {
	channelID := 0
	modelName := ""
	groupName := ""
	for _, part := range strings.Split(strings.TrimSpace(key), "|") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		switch {
		case strings.HasPrefix(part, "channel:"):
			id, err := strconv.Atoi(strings.TrimPrefix(part, "channel:"))
			if err == nil && id > 0 {
				channelID = id
			}
		case strings.HasPrefix(part, "model:"):
			modelName = strings.TrimPrefix(part, "model:")
		case strings.HasPrefix(part, "group:"):
			groupName = strings.TrimPrefix(part, "group:")
		}
	}
	return channelID, modelName, groupName
}
