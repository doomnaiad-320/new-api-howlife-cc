package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
)

func TestFormatUserLogsHidesChannelInfo(t *testing.T) {
	logs := []*Log{
		{
			Id:          99,
			ChannelId:   123,
			ChannelName: "split-channel",
			Other:       `{"channel_id":123,"channel_name":"split-channel","channel_type":1,"admin_info":{"use_channel":["123"]},"reject_reason":"hidden","is_model_mapped":true,"upstream_model_name":"mapped-model","safe":"keep"}`,
		},
	}

	formatUserLogs(logs, 5)

	if logs[0].ChannelId != 0 {
		t.Fatalf("expected channel id to be masked, got %d", logs[0].ChannelId)
	}
	if logs[0].ChannelName != "" {
		t.Fatalf("expected channel name to be masked, got %q", logs[0].ChannelName)
	}
	if logs[0].Id != 6 {
		t.Fatalf("expected display id to be reindexed, got %d", logs[0].Id)
	}

	var other map[string]interface{}
	if err := common.UnmarshalJsonStr(logs[0].Other, &other); err != nil {
		t.Fatalf("failed to decode masked log other: %v", err)
	}

	for _, key := range []string{"channel_id", "channel_name", "channel_type", "admin_info", "reject_reason", "is_model_mapped", "upstream_model_name"} {
		if _, exists := other[key]; exists {
			t.Fatalf("expected %s to be removed from user log payload", key)
		}
	}
	if other["safe"] != "keep" {
		t.Fatalf("expected safe fields to remain, got %#v", other["safe"])
	}
}
