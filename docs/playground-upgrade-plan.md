# Playground 升级方案分析

## 当前 Playground 现状

### 已有功能

- 基础对话（文本输入/输出）
- 图片输入（多模态基础支持）
- 流式输出 (SSE)
- 自定义请求体模式
- 参数调节（temperature、top_p 等）
- 调试面板
- 配置导入/导出

### 缺失功能

- MCP (Model Context Protocol) 支持
- RAG 向量检索
- 文件上传/解析
- 知识库管理
- 对话历史持久化（目前只存 localStorage）
- Agent/工具调用可视化

---

## 两种方案对比

| 维度 | 方案一：改造现有 Playground | 方案二：独立前端项目 |
|------|---------------------------|---------------------|
| **开发复杂度** | 中等 | 较高（需要新建项目） |
| **维护成本** | 与主项目耦合，升级需同步 | 独立维护，灵活度高 |
| **部署方式** | 单体部署，简单 | 需要单独部署前端 |
| **技术栈自由度** | 受限于 Semi UI + React | 可选 Next.js/Nuxt/Vue 等 |
| **功能边界** | 适合轻量级增强 | 适合做成完整产品 |
| **用户体验** | 管理后台风格 | 可做成专业 AI 应用风格 |
| **后端改动** | 需要在 new-api 中添加 API | 可复用现有 API，按需扩展 |

---

## 方案一：改造现有 Playground

### 适合场景

给现有用户提供增强的测试/调试能力

### 需要做的事

```
1. 多模态增强
   ├── 文件上传组件（PDF、Word、图片等）
   ├── 音频输入/输出
   └── 视频理解（如 Gemini）

2. MCP 支持
   ├── 前端：工具选择器 UI
   ├── 前端：工具调用结果展示
   └── 后端：MCP 协议适配层

3. RAG 功能
   ├── 知识库管理页面
   ├── 文档上传/解析
   ├── 向量数据库集成（后端）
   └── 检索结果展示

4. 对话管理
   ├── 对话历史列表
   ├── 对话持久化（数据库）
   └── 对话分享/导出
```

### 后端需要新增

- `/api/knowledge` - 知识库 CRUD
- `/api/vector` - 向量检索
- `/api/mcp/tools` - MCP 工具列表
- `/api/conversations` - 对话持久化

---

## 方案二：独立前端项目

### 适合场景

做成一个面向终端用户的 AI 应用产品

### 架构设计

```
┌─────────────────────────────────────────────────────┐
│                   独立前端项目                        │
│  (Next.js / Nuxt / React + Vite)                    │
├─────────────────────────────────────────────────────┤
│  功能模块：                                          │
│  ├── 对话界面（类 ChatGPT/Claude 风格）              │
│  ├── 知识库管理                                      │
│  ├── MCP 工具市场                                    │
│  ├── Agent 工作流编排                                │
│  ├── 多模态交互（语音、图片、文件）                   │
│  └── 用户设置/API Key 管理                           │
└─────────────────────────────────────────────────────┘
                         │
                         │ HTTP/WebSocket
                         ▼
┌─────────────────────────────────────────────────────┐
│                   new-api 后端                       │
├─────────────────────────────────────────────────────┤
│  现有功能：                                          │
│  ├── /v1/chat/completions (OpenAI 兼容)             │
│  ├── /api/token (令牌管理)                          │
│  ├── /api/user (用户管理)                           │
│  └── /api/channel (渠道管理)                        │
├─────────────────────────────────────────────────────┤
│  需要新增：                                          │
│  ├── /api/conversations (对话持久化)                │
│  ├── /api/knowledge (知识库)                        │
│  ├── /api/vector (向量检索)                         │
│  └── /api/mcp/* (MCP 协议)                          │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│              向量数据库 (可选)                        │
│  Milvus / Qdrant / Weaviate / pgvector              │
└─────────────────────────────────────────────────────┘
```

### 技术栈推荐

| 组件 | 推荐选择 | 理由 |
|------|---------|------|
| 框架 | Next.js 14+ | SSR、App Router、生态丰富 |
| UI | shadcn/ui + Tailwind | 现代、可定制、轻量 |
| 状态管理 | Zustand | 简单、TypeScript 友好 |
| 向量数据库 | Qdrant 或 pgvector | Qdrant 性能好，pgvector 与现有 PG 集成 |
| 文件解析 | Unstructured / LangChain | 支持多种格式 |

---

## 建议

### 如果你的目标是：

1. **给现有用户增强体验** → 选方案一，改造 Playground
2. **做一个独立的 AI 产品** → 选方案二，独立前端
3. **两者都要** → 先做方案二，成熟后可以把部分功能移植回 Playground

### 推荐方案二的原因

从投入产出比来看，推荐方案二：

1. **解耦** - 前后端分离，迭代更快
2. **专注** - new-api 专注做 API 网关，新项目专注做用户体验
3. **灵活** - 可以用更现代的技术栈（Next.js、shadcn/ui）
4. **可复用** - 新前端可以对接任何 OpenAI 兼容的后端，不仅限于 new-api

---

## 功能模块详细设计

### 1. 多模态支持

#### 文件上传
- 支持格式：PDF、Word、Excel、TXT、Markdown、图片、音频、视频
- 文件大小限制：可配置
- 存储方式：本地/S3/OSS

#### 图片处理
- 支持粘贴、拖拽、URL 输入
- 自动压缩/转换 Base64
- 支持多图输入

#### 音频处理
- 语音输入（Whisper API）
- 语音输出（TTS API）
- 实时语音对话

### 2. MCP (Model Context Protocol) 支持

#### 工具管理
- 内置工具：网页搜索、代码执行、文件操作
- 自定义工具：用户可添加自定义 MCP 服务器
- 工具市场：共享和发现工具

#### 工具调用流程
```
用户输入 → LLM 判断是否需要工具 → 调用工具 → 返回结果 → LLM 生成回复
```

#### UI 设计
- 工具选择器（侧边栏）
- 工具调用过程可视化
- 工具结果展示

### 3. RAG 向量检索

#### 知识库管理
- 创建/删除知识库
- 文档上传/删除
- 文档分块策略配置

#### 向量检索
- 相似度搜索
- 混合检索（向量 + 关键词）
- 重排序（Rerank）

#### 检索增强生成
- 自动注入相关文档到 Prompt
- 引用来源标注
- 检索结果预览

### 4. 对话管理

#### 对话持久化
- 数据库存储（PostgreSQL/MySQL）
- 对话列表
- 对话搜索

#### 对话功能
- 对话重命名
- 对话删除
- 对话导出（Markdown/JSON）
- 对话分享（生成链接）

### 5. Agent 工作流

#### 工作流编排
- 可视化编排界面
- 节点类型：LLM、工具、条件、循环
- 变量传递

#### 预设 Agent
- 代码助手
- 写作助手
- 研究助手
- 数据分析助手

---

## 数据库设计（新增表）

### conversations 表
```sql
CREATE TABLE conversations (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(255),
    model VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### messages 表
```sql
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### knowledge_bases 表
```sql
CREATE TABLE knowledge_bases (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    embedding_model VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### documents 表
```sql
CREATE TABLE documents (
    id BIGSERIAL PRIMARY KEY,
    knowledge_base_id BIGINT NOT NULL,
    filename VARCHAR(255),
    file_type VARCHAR(50),
    file_size BIGINT,
    chunk_count INT,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### mcp_tools 表
```sql
CREATE TABLE mcp_tools (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    server_url VARCHAR(500),
    config JSONB,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API 设计（新增接口）

### 对话管理
- `GET /api/conversations` - 获取对话列表
- `POST /api/conversations` - 创建对话
- `GET /api/conversations/:id` - 获取对话详情
- `PUT /api/conversations/:id` - 更新对话
- `DELETE /api/conversations/:id` - 删除对话
- `GET /api/conversations/:id/messages` - 获取对话消息

### 知识库管理
- `GET /api/knowledge` - 获取知识库列表
- `POST /api/knowledge` - 创建知识库
- `DELETE /api/knowledge/:id` - 删除知识库
- `POST /api/knowledge/:id/documents` - 上传文档
- `DELETE /api/knowledge/:id/documents/:docId` - 删除文档
- `POST /api/knowledge/:id/search` - 向量检索

### MCP 工具
- `GET /api/mcp/tools` - 获取工具列表
- `POST /api/mcp/tools` - 添加工具
- `DELETE /api/mcp/tools/:id` - 删除工具
- `POST /api/mcp/tools/:id/invoke` - 调用工具

---

## 开发路线图

### Phase 1: 基础框架（2-3 周）
- [ ] 项目初始化（Next.js + shadcn/ui）
- [ ] 用户认证对接 new-api
- [ ] 基础对话界面
- [ ] 对话持久化

### Phase 2: 多模态（2-3 周）
- [ ] 文件上传组件
- [ ] 图片输入增强
- [ ] 音频输入/输出

### Phase 3: RAG（3-4 周）
- [ ] 知识库管理界面
- [ ] 文档解析服务
- [ ] 向量数据库集成
- [ ] 检索增强生成

### Phase 4: MCP（2-3 周）
- [ ] MCP 协议适配
- [ ] 工具管理界面
- [ ] 工具调用可视化

### Phase 5: Agent（3-4 周）
- [ ] 工作流编排界面
- [ ] 预设 Agent
- [ ] Agent 市场

---

*文档创建时间：2024-12-28*
