package service

import (
	"errors"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/gin-gonic/gin"
)

func cacheGetRouterV2Channel(param *RetryParam) (*model.Channel, string, error) {
	selectGroup := param.TokenGroup
	userGroup := common.GetContextKeyString(param.Ctx, constant.ContextKeyUserGroup)

	if param.TokenGroup == "auto" {
		if len(setting.GetAutoGroups()) == 0 {
			return nil, selectGroup, errors.New("auto groups is not enabled")
		}
		autoGroups := GetUserAutoGroup(userGroup)
		startGroupIndex := 0
		if lastGroupIndex, exists := common.GetContextKey(param.Ctx, constant.ContextKeyAutoGroupIndex); exists {
			if idx, ok := lastGroupIndex.(int); ok && idx >= 0 {
				startGroupIndex = idx
			}
		}
		if startGroupIndex >= len(autoGroups) {
			startGroupIndex = 0
		}

		for i := startGroupIndex; i < len(autoGroups); i++ {
			groupName := autoGroups[i]
			channel, err := pickRouterV2ChannelFromGroup(param.Ctx, groupName, param.ModelName)
			if err != nil {
				return nil, groupName, err
			}
			if channel == nil {
				common.SetContextKey(param.Ctx, constant.ContextKeyAutoGroupIndex, i+1)
				continue
			}
			common.SetContextKey(param.Ctx, constant.ContextKeyAutoGroup, groupName)
			common.SetContextKey(param.Ctx, constant.ContextKeyAutoGroupIndex, i)
			return channel, groupName, nil
		}
		return nil, selectGroup, nil
	}

	channel, err := pickRouterV2ChannelFromGroup(param.Ctx, param.TokenGroup, param.ModelName)
	if err != nil {
		return nil, param.TokenGroup, err
	}
	return channel, param.TokenGroup, nil
}

func pickRouterV2ChannelFromGroup(ctx *gin.Context, groupName, modelName string) (*model.Channel, error) {
	candidates, err := model.ListSatisfiedChannels(groupName, modelName)
	if err != nil {
		return nil, err
	}
	if len(candidates) == 0 {
		return nil, nil
	}

	triedChannels := getTriedChannelSet(ctx)
	primaryPool := make([]*model.Channel, 0, len(candidates))
	fallbackPool := make([]*model.Channel, 0, len(candidates))
	for _, channel := range candidates {
		if channel == nil {
			continue
		}
		if _, tried := triedChannels[channel.Id]; tried {
			continue
		}
		if isFallbackChannel(channel) {
			fallbackPool = append(fallbackPool, channel)
			continue
		}
		primaryPool = append(primaryPool, channel)
	}

	if len(primaryPool) > 0 {
		selected := primaryPool[common.GetRandomInt(len(primaryPool))]
		logger.LogDebug(ctx, "router v2 selected primary channel #%d (group=%s, model=%s)", selected.Id, groupName, modelName)
		return selected, nil
	}
	if len(fallbackPool) > 0 {
		selected := fallbackPool[common.GetRandomInt(len(fallbackPool))]
		logger.LogDebug(ctx, "router v2 selected fallback channel #%d (group=%s, model=%s)", selected.Id, groupName, modelName)
		return selected, nil
	}
	return nil, nil
}

func getTriedChannelSet(ctx *gin.Context) map[int]struct{} {
	tried := make(map[int]struct{})
	if ctx == nil {
		return tried
	}
	for _, channelIDText := range ctx.GetStringSlice("use_channel") {
		channelID, err := strconv.Atoi(channelIDText)
		if err != nil || channelID <= 0 {
			continue
		}
		tried[channelID] = struct{}{}
	}
	return tried
}

func isFallbackChannel(channel *model.Channel) bool {
	if channel == nil {
		return false
	}
	return channel.GetSetting().FallbackOnly
}
