package operation_setting

import (
	"strings"

	"github.com/QuantumNous/new-api/setting/config"
)

type CircuitBreakerSetting struct {
	Enabled bool `json:"enabled"`

	// ConsecutiveFailures is the number of trigger-status failures before opening cooldown.
	ConsecutiveFailures int `json:"consecutive_failures"`
	// CooldownSeconds is the temporary open duration after breaker is triggered.
	CooldownSeconds int `json:"cooldown_seconds"`
	// FailureWindowSeconds resets consecutive count when no new failure arrives in this window.
	FailureWindowSeconds int `json:"failure_window_seconds"`

	// TriggerStatusCodes accepts HTTP status code rules like "429" or "429,500-599".
	TriggerStatusCodes string `json:"trigger_status_codes"`

	// ScopeByModel/ScopeByGroup control breaker key granularity.
	ScopeByModel bool `json:"scope_by_model"`
	ScopeByGroup bool `json:"scope_by_group"`

	// LogSkipEvents controls whether skip events in cooldown are logged.
	LogSkipEvents bool `json:"log_skip_events"`
}

var circuitBreakerSetting = CircuitBreakerSetting{
	Enabled:              false,
	ConsecutiveFailures:  3,
	CooldownSeconds:      30,
	FailureWindowSeconds: 120,
	TriggerStatusCodes:   "429",
	ScopeByModel:         false,
	ScopeByGroup:         false,
	LogSkipEvents:        false,
}

func init() {
	config.GlobalConfig.Register("circuit_breaker_setting", &circuitBreakerSetting)
}

func GetCircuitBreakerSetting() *CircuitBreakerSetting {
	return &circuitBreakerSetting
}

func (s *CircuitBreakerSetting) EffectiveConsecutiveFailures() int {
	if s == nil || s.ConsecutiveFailures <= 0 {
		return 3
	}
	return s.ConsecutiveFailures
}

func (s *CircuitBreakerSetting) EffectiveCooldownSeconds() int {
	if s == nil || s.CooldownSeconds <= 0 {
		return 30
	}
	return s.CooldownSeconds
}

func (s *CircuitBreakerSetting) EffectiveFailureWindowSeconds() int {
	if s == nil || s.FailureWindowSeconds <= 0 {
		return 120
	}
	return s.FailureWindowSeconds
}

func (s *CircuitBreakerSetting) IsTriggerStatusCode(code int) bool {
	if code < 100 || code > 599 {
		return false
	}
	if s == nil {
		return code == 429
	}
	rules := strings.TrimSpace(s.TriggerStatusCodes)
	if rules == "" {
		rules = "429"
	}
	ranges, err := ParseHTTPStatusCodeRanges(rules)
	if err != nil || len(ranges) == 0 {
		return code == 429
	}
	return shouldMatchStatusCodeRanges(ranges, code)
}
