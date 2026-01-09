#!/bin/bash

# 启动脚本 - 在两个独立终端窗口中启动后端和前端服务

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================"
echo "   启动 New API 开发环境"
echo "========================================"

# 在新终端窗口中启动后端
osascript -e "tell application \"Terminal\"
    do script \"cd '$SCRIPT_DIR' && echo '🚀 启动后端服务...' && go run main.go\"
    set custom title of front window to \"Backend - localhost:3000\"
end tell"

echo "✅ 后端服务窗口已打开"

# 等待一下让后端先启动
sleep 1

# 在新终端窗口中启动前端
osascript -e "tell application \"Terminal\"
    do script \"cd '$SCRIPT_DIR/web' && echo '🎨 启动前端开发服务器...' && npm run dev\"
    set custom title of front window to \"Frontend - localhost:5173\"
end tell"

echo "✅ 前端服务窗口已打开"

echo ""
echo "========================================"
echo "   服务启动中..."
echo "========================================"
echo "📡 后端地址: http://localhost:3000"
echo "🎨 前端地址: http://localhost:5173"
echo ""
echo "💡 提示: 开发时请访问前端地址 (5173)"
echo "   两个终端窗口可独立关闭"
echo "========================================"
