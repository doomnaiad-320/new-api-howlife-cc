package operation_setting

import "github.com/QuantumNous/new-api/setting/config"

type QuotaSetting struct {
	EnableFreeModelPreConsume bool `json:"enable_free_model_pre_consume"` // 是否对免费模型启用预消耗
	TopupRebatePercent        int  `json:"topup_rebate_percent"`          // 充值返利百分比 (0-100)
	TopupRebateMaxCount       int  `json:"topup_rebate_max_count"`        // 最大返利次数
}

// 默认配置
var quotaSetting = QuotaSetting{
	EnableFreeModelPreConsume: true,
	TopupRebatePercent:        0, // 默认不返利
	TopupRebateMaxCount:       0, // 默认0次
}

func init() {
	// 注册到全局配置管理器
	config.GlobalConfig.Register("quota_setting", &quotaSetting)
}

func GetQuotaSetting() *QuotaSetting {
	return &quotaSetting
}
