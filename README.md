# AI 画室

基于 Next.js 的 AI 图片生成聊天室应用。用户通过与不同风格的 AI 智能体对话，输入文字描述或上传参考图，即可生成风格化图片，并可发布到公共广场展示。

## 功能特性

- **多智能体** — 支持创建多个 AI 画师，各自拥有独立的系统提示词和风格定位
- **图片生成** — 文生图 / 图生图，支持多张参考图
- **广场展示** — 用户可将满意的作品发布到公共广场
- **内容审核** — 关键词过滤 + AI 审核模型双重拦截
- **管理后台** — 智能体管理、消息管理、全局设置（所有配置均可在后台动态修改）
- **深色模式** — 跟随系统 / 手动切换
- **语音输入** — 语音转文字（需配置语音识别 API）

## 技术栈

- **前端：** Next.js 16 + React 19 + Tailwind CSS 4
- **后端：** Next.js API Routes + SSE 流式响应
- **数据库：** Prisma ORM + SQLite
- **部署：** Docker / Node.js

## 快速开始

### Docker 部署（推荐）

镜像托管在 GitHub Container Registry：

```bash
docker run -d \
  --name chatroom \
  -p 3000:3000 \
  -v chatroom-data:/app/prisma \
  ghcr.io/tanranv5/chatroom:latest
```

docker-compose：

```yaml
version: "3.8"
services:
  chatroom:
    image: ghcr.io/tanranv5/chatroom:latest
    ports:
      - "3000:3000"
    volumes:
      - chatroom-data:/app/prisma
    restart: unless-stopped

volumes:
  chatroom-data:
```

> **说明：** 首次启动会自动初始化数据库。所有 API 配置（图片生成、图床、语音识别、内容审核等）均可在管理后台「全局设置」中配置，无需设置环境变量。

### 本地开发

```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma generate
npx prisma db push

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### 生产部署（Node.js）

```bash
npm install
npx prisma generate
npx prisma db push
npm run build
npm run start
```

推荐使用 PM2 做进程守护：

```bash
pm2 start npm --name chatroom -- run start
```

## 管理后台

访问 `/admin` 进入管理后台，默认密码：`admin123`

**全局设置支持配置：**

| 配置项 | 说明 |
|--------|------|
| 图片生成 API | API 地址、密钥、模型名称 |
| 图床服务 | 图床地址、认证 Token |
| 语音识别 API | API 地址、密钥 |
| 内容审核 API | API 地址、密钥、模型名称 |
| 管理密码 | 后台登录密码 |

## 项目结构

```
src/
├── app/
│   ├── api/           # API 路由
│   │   ├── agents/    # 智能体 CRUD + 消息
│   │   ├── admin/     # 管理后台接口
│   │   ├── square/    # 广场数据
│   │   ├── settings/  # 全局设置
│   │   └── user/      # 用户信息
│   ├── admin/         # 管理后台页面
│   ├── layout.tsx     # 根布局
│   └── page.tsx       # 首页
├── components/        # React 组件
├── contexts/          # Context Provider
└── lib/               # 工具库
prisma/
├── schema.prisma      # 数据模型
└── dev.db             # SQLite 数据库文件（运行时生成）
```

## License

MIT
