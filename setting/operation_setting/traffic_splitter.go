package operation_setting

import "github.com/QuantumNous/new-api/setting/config"

type TrafficSplitterRule struct {
	Model      string `json:"model"`
	Threshold  int    `json:"threshold"`
	ChannelAId int    `json:"channel_a_id"`
	ChannelBId int    `json:"channel_b_id"`
}

type TrafficSplitterSetting struct {
	Enabled bool                  `json:"enabled"`
	Rules   []TrafficSplitterRule `json:"rules"`
}

var trafficSplitterSetting = TrafficSplitterSetting{
	Enabled: false,
	Rules:   []TrafficSplitterRule{},
}

func init() {
	config.GlobalConfig.Register("traffic_splitter", &trafficSplitterSetting)
}

func GetTrafficSplitterSetting() *TrafficSplitterSetting {
	return &trafficSplitterSetting
}
