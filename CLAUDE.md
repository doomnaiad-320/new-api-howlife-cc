# New API - 项目指南

> 本文件用于引导 Claude Code 快速理解项目结构，减少不必要的文件扫描，节省 Token 消耗。

## 项目概述

New API 是一个 OpenAI API 兼容的多模型管理与分发平台，支持多种 AI 模型提供商的统一接入。

## 技术栈

### 后端
- **语言**: Go 1.25
- **框架**: Gin (Web), GORM (ORM)
- **数据库**: MySQL / PostgreSQL / SQLite
- **缓存**: Redis
- **认证**: JWT, 2FA (TOTP), Passkey (WebAuthn)

### 前端
- **框架**: React 18
- **UI 库**: Semi Design (@douyinfe/semi-ui)
- **图表**: VChart (@visactor/vchart)
- **路由**: react-router-dom v6
- **国际化**: i18next
- **构建**: Vite

---

## 目录结构速查

### 后端核心目录

| 目录 | 作用 | 关键文件 |
|-----|------|---------|
| `controller/` | API 控制器 | user.go, token.go, channel.go |
| `model/` | 数据模型 + 数据库操作 | user.go, token.go, channel.go, option.go |
| `router/` | 路由定义 | api-router.go (主路由), relay-router.go (转发) |
| `service/` | 业务逻辑层 | quota.go, channel_select.go, token_counter.go |
| `middleware/` | 中间件 | auth.go, rate-limit.go, distributor.go |
| `relay/` | API 转发核心 | relay_task.go, channel/ (各厂商适配器) |
| `dto/` | 数据传输对象 | openai_request.go, openai_response.go |
| `common/` | 公共工具 | utils.go, redis.go, constants.go |
| `constant/` | 常量定义 | channel.go (渠道类型), context_key.go |
| `setting/` | 配置管理 | system_setting/, operation_setting/ |
| `types/` | 类型定义 | error.go, request_meta.go |

### 前端核心目录

| 目录 | 作用 | 关键文件 |
|-----|------|---------|
| `web/src/pages/` | 页面组件 | User/, Token/, Channel/, Setting/ |
| `web/src/components/` | 公共组件 | layout/, table/, auth/, playground/ |
| `web/src/helpers/` | 工具函数 | api.js, utils.js |
| `web/src/hooks/` | React Hooks | useAuth.js, useApi.js |
| `web/src/constants/` | 前端常量 | - |
| `web/src/i18n/` | 国际化配置 | - |
| `web/src/App.jsx` | 应用入口 | 路由配置 |

---

## 模块索引

### 用户模块 (User)
```
后端:
- controller/user.go      # 用户 CRUD、登录、注册、OAuth
- model/user.go           # 用户模型、数据库操作
- model/user_cache.go     # 用户缓存
- service/user_notify.go  # 用户通知服务

前端:
- web/src/pages/User/     # 用户管理页面
- web/src/components/auth/ # 登录/注册组件
```

### 令牌模块 (Token)
```
后端:
- controller/token.go     # 令牌 CRUD
- model/token.go          # 令牌模型
- model/token_cache.go    # 令牌缓存
- middleware/auth.go      # 令牌验证中间件

前端:
- web/src/pages/Token/    # 令牌管理页面
```

### 渠道模块 (Channel)
```
后端:
- controller/channel.go       # 渠道 CRUD、测试
- controller/channel-test.go  # 渠道测试逻辑
- controller/channel-billing.go # 渠道余额查询
- model/channel.go            # 渠道模型
- model/channel_cache.go      # 渠道缓存
- service/channel_select.go   # 渠道选择算法
- relay/channel/              # 各厂商适配器 (openai/, claude/, gemini/ 等)

前端:
- web/src/pages/Channel/      # 渠道管理页面
```

### 模型管理 (Model)
```
后端:
- controller/model.go         # 模型列表
- controller/model_meta.go    # 模型元数据
- controller/model_sync.go    # 模型同步
- model/ability.go            # 模型能力定义
- model/pricing.go            # 模型定价

前端:
- web/src/pages/Model/        # 模型管理页面
- web/src/pages/Pricing/      # 定价页面
```

### 充值模块 (TopUp)
```
后端:
- controller/topup.go         # 充值入口
- controller/topup_stripe.go  # Stripe 支付
- controller/topup_creem.go   # Creem 支付
- model/topup.go              # 充值记录
- model/redemption.go         # 兑换码

前端:
- web/src/pages/TopUp/        # 充值页面
- web/src/pages/Redemption/   # 兑换码页面
- web/src/components/topup/   # 充值组件
```

### 日志模块 (Log)
```
后端:
- controller/log.go           # 日志查询
- model/log.go                # 日志模型
- service/log_info_generate.go # 日志生成

前端:
- web/src/pages/Log/          # 日志页面
```

### 系统设置 (Setting)
```
后端:
- controller/option.go        # 系统选项 CRUD
- model/option.go             # 选项模型
- setting/system_setting/     # 系统设置
- setting/operation_setting/  # 运营设置

前端:
- web/src/pages/Setting/      # 设置页面 (多个子页面)
- web/src/components/settings/ # 设置组件
```

### API 转发 (Relay)
```
后端:
- controller/relay.go         # 转发入口
- relay/relay_task.go         # 转发任务处理
- relay/relay_adaptor.go      # 适配器接口
- relay/channel/openai/       # OpenAI 适配
- relay/channel/claude/       # Claude 适配
- relay/channel/gemini/       # Gemini 适配
- relay/channel/ali/          # 阿里云适配
- relay/channel/aws/          # AWS Bedrock 适配
... (更多厂商在 relay/channel/ 下)
```

### Midjourney 模块
```
后端:
- controller/midjourney.go    # MJ 任务管理
- model/midjourney.go         # MJ 任务模型
- service/midjourney.go       # MJ 服务
- relay/mjproxy_handler.go    # MJ 代理处理

前端:
- web/src/pages/Midjourney/   # MJ 页面
```

### 任务模块 (Task/Video)
```
后端:
- controller/task.go          # 通用任务
- controller/task_video.go    # 视频任务
- model/task.go               # 任务模型
- relay/relay_task.go         # 任务转发

前端:
- web/src/pages/Task/         # 任务页面
```

---

## 常见开发任务指引

### 添加新 API 接口
1. 在 `model/` 创建数据模型（如需要）
2. 在 `controller/` 添加控制器方法
3. 在 `router/api-router.go` 注册路由
4. 如需中间件，在 `middleware/` 添加

### 添加新页面
1. 在 `web/src/pages/` 创建页面目录和组件
2. 在 `web/src/App.jsx` 添加路由
3. 如需 API 调用，在 `web/src/helpers/api.js` 添加

### 添加新渠道适配器
1. 在 `relay/channel/` 创建新目录
2. 实现 `Adaptor` 接口 (参考 `relay/channel/openai/`)
3. 在 `constant/channel.go` 添加渠道类型常量
4. 在 `relay/channel/adapter.go` 注册适配器

### 修改系统设置
1. 后端: `model/option.go` + `setting/` 相关文件
2. 前端: `web/src/pages/Setting/` + `web/src/components/settings/`

---

## 开发规范

### 后端
- 错误响应格式: `c.JSON(http.StatusOK, gin.H{"success": false, "message": "..."})`
- 成功响应格式: `c.JSON(http.StatusOK, gin.H{"success": true, "data": ...})`
- 使用 `common.SysLog` 记录系统日志
- 数据库操作使用 GORM，避免原生 SQL

### 前端
- 使用 Semi Design 组件库
- 使用 i18next 进行国际化
- API 请求使用 axios，封装在 helpers/api.js
- 状态管理使用 React Context

---

## 配置文件

| 文件 | 作用 |
|-----|------|
| `.env` | 环境变量（数据库、Redis 等） |
| `.env.example` | 环境变量示例 |
| `go.mod` | Go 依赖 |
| `web/package.json` | 前端依赖 |
| `docker-compose.yml` | Docker 部署配置 |

---

## 禁止事项

- 不要修改 `.env` 文件（包含敏感信息）
- 不要直接扫描整个项目目录
- 不要修改 `go.sum` 或 `package-lock.json`
- 不要在未确认的情况下修改数据库迁移

---

## 工作流程要求

### 开始新任务时
1. **先问清楚**: 要修改哪个模块/功能？
2. **精准定位**: 根据上面的模块索引，只读取相关文件
3. **不要扫描**: 禁止使用 Glob/Grep 扫描整个项目（除非明确需要全局搜索）

### 示例对话
```
用户: "添加一个新的 API 接口"
Claude: "请问这个 API 属于哪个模块？（用户/令牌/渠道/充值/其他）"
用户: "用户模块"
Claude: 只读取 controller/user.go, model/user.go, router/api-router.go
```

### 上下文管理规则

**重要**: 每 15 轮对话后，请执行 `/compact` 压缩上下文，以保持性能和减少 Token 消耗。

Claude 会在以下情况主动提醒：
- 对话轮数接近 15 轮时
- 完成一个较大功能后
- 上下文内容明显增多时

---

## 快速命令

| 命令 | 作用 |
|-----|------|
| `go run main.go` | 启动后端 |
| `cd web && npm run dev` | 启动前端开发服务器 |
| `cd web && npm run build` | 构建前端 |
| `make build` | 构建后端二进制 |

---

## 入口文件

- **后端入口**: `main.go`
- **前端入口**: `web/src/index.jsx`
- **路由入口**: `router/main.go` → `router/api-router.go`
