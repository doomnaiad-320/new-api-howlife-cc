package operation_setting

import "strings"

const (
	RouterModeV1 = "v1"
	RouterModeV2 = "v2"
)

// RouterMode controls request channel routing strategy.
// Default keeps legacy behavior for safety.
var RouterMode = RouterModeV1

func NormalizeRouterMode(mode string) string {
	mode = strings.ToLower(strings.TrimSpace(mode))
	switch mode {
	case RouterModeV2:
		return RouterModeV2
	default:
		return RouterModeV1
	}
}

func IsRouterModeV2() bool {
	return RouterMode == RouterModeV2
}
