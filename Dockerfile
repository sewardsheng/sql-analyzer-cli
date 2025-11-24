# 使用官方Bun运行时作为基础镜像
FROM oven/bun:1.3.1-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和bun.lockb
COPY package.json bun.lockb ./

# 安装依赖
RUN bun install --frozen-lockfile --production

# 复制源代码
COPY src/ ./src/
COPY rules/ ./rules/
COPY .env.example .env

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bunuser -u 1001

# 更改文件所有权
RUN chown -R bunuser:nodejs /app
USER bunuser

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run healthcheck || exit 1

# 启动命令
CMD ["bun", "run", "start"]