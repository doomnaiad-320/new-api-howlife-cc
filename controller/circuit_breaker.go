package controller

import (
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/service"
	"github.com/gin-gonic/gin"
)

func GetCircuitBreakerStates(c *gin.Context) {
	states, err := service.ListCircuitBreakerOpenStates()
	if err != nil {
		common.ApiError(c, err)
		return
	}

	common.ApiSuccess(c, gin.H{
		"enabled":  service.IsCircuitBreakerEnabled(),
		"count":    len(states),
		"now_unix": time.Now().Unix(),
		"items":    states,
	})
}
