# ---- 阶段 1: 安装依赖 ----
FROM node:20-alpine AS deps
WORKDIR /app

# 设置 npm 镜像加速
RUN npm config set registry https://registry.npmmirror.com

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline

# ---- 阶段 2: 构建 ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 生成 Prisma Client（使用已安装的 prisma）
RUN ./node_modules/.bin/prisma generate

# 构建 Next.js（standalone 模式）
RUN npm run build

# ---- 阶段 3: 运行 ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 拷贝 standalone 产物
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 拷贝 Prisma 相关文件
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# 数据库目录权限（挂载卷时需要写权限）
RUN chown -R nextjs:nodejs /app/prisma

# 启动脚本：初始化数据库 + 启动服务
COPY <<'EOF' /app/entrypoint.sh
#!/bin/sh
set -e
# 如果数据库文件不存在，自动创建表结构
if [ ! -f /app/prisma/dev.db ]; then
  echo "初始化数据库..."
  ./node_modules/.bin/prisma db push --skip-generate
fi
exec node server.js
EOF
RUN chmod +x /app/entrypoint.sh

USER nextjs

EXPOSE 3000

CMD ["/app/entrypoint.sh"]
