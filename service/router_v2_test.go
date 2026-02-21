package service

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
)

func TestIsFallbackChannel(t *testing.T) {
	trueSetting := `{"fallback_only":true}`
	falseSetting := `{"fallback_only":false}`

	cases := []struct {
		name    string
		channel *model.Channel
		want    bool
	}{
		{name: "nil channel", channel: nil, want: false},
		{
			name: "fallback switch enabled",
			channel: &model.Channel{
				Setting: common.GetPointer(trueSetting),
				Tag:     common.GetPointer("normal"),
			},
			want: true,
		},
		{
			name: "fallback switch disabled and tag fallback",
			channel: &model.Channel{
				Setting: common.GetPointer(falseSetting),
				Tag:     common.GetPointer("fallback"),
			},
			want: false,
		},
		{
			name: "fallback switch disabled and normal tag",
			channel: &model.Channel{
				Setting: common.GetPointer(falseSetting),
				Tag:     common.GetPointer("normal"),
			},
			want: false,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := isFallbackChannel(tc.channel)
			if got != tc.want {
				t.Fatalf("isFallbackChannel() = %v, want %v", got, tc.want)
			}
		})
	}
}
