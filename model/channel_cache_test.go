package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
)

func TestIsChannelSelectableRejectsSplitOnly(t *testing.T) {
	SetChannelSelectableChecker(nil)
	t.Cleanup(func() {
		SetChannelSelectableChecker(nil)
	})

	splitOnlySetting := `{"split_only":true}`
	normalSetting := `{"split_only":false}`

	if isChannelSelectable(&Channel{Setting: common.GetPointer(splitOnlySetting)}, "default", "gpt-4o") {
		t.Fatalf("split-only channel should be excluded from normal selection")
	}

	SetChannelSelectableChecker(func(channel *Channel, group string, model string) bool {
		return group == "default" && model == "gpt-4o"
	})

	if !isChannelSelectable(&Channel{Setting: common.GetPointer(normalSetting)}, "default", "gpt-4o") {
		t.Fatalf("normal channel should remain selectable when checker allows it")
	}
	if isChannelSelectable(&Channel{Setting: common.GetPointer(normalSetting)}, "vip", "gpt-4o") {
		t.Fatalf("custom checker should still apply after split-only filtering")
	}
}
