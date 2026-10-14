# Wedesk 纯 Cloudflare 零服务器部署指南

本项目已为你定制并实现 **100% 运行在 Cloudflare 上的 Serverless 后端**（位于 `cloudflare/` 目录），无需购买任何云服务器/VPS、无需备案、费用为 0。

---

## 架构组成

- **Web 主控端**：Cloudflare Pages（免费无限流量 CDN 托管）
- **业务 API 与 WebRTC 信令**：Cloudflare Worker + Durable Objects（兼容 Engine.IO / Socket.IO v4 协议）
- **设备号与密码数据库**：Cloudflare D1（Serverless SQLite 数据库）
- **P2P NAT 打洞与中继**：Cloudflare TURN / Calls 服务

---

## 部署步骤

### 1. 登录 Cloudflare
打开终端，运行：
```bash
npx wrangler login
```
浏览器将自动弹出授权，点击允许即可。

---

### 2. 创建并初始化 D1 数据库
进入 `cloudflare` 目录：
```bash
cd cloudflare
```
创建数据库：
```bash
npx wrangler d1 create wedesk-db
```
执行后终端会输出类似如下内容：
```toml
database_name = "wedesk-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
复制其中的 `database_id`，打开 `cloudflare/wrangler.toml`，替换对应字段：
```toml
database_id = "你复制的database_id"
```

初始化数据表结构：
```bash
npx wrangler d1 execute wedesk-db --file=./schema.sql --remote
```

---

### 3. 一键部署后端 Worker
在 `cloudflare` 目录下执行：
```bash
npx wrangler deploy
```
部署成功后，控制台会输出你的后端公网地址，例如：
`https://wedesk-backend.<你的前缀>.workers.dev`

---

### 4. 配置前端连接后端
打开项目源码根目录下的 `src/constant.ts`，修改线上地址（约 47~56 行）：

```typescript
export const WEBSOCKET_URL =
  process.env.NODE_ENV === 'development'
    ? `ws://localhost:4300`
    : `wss://wedesk-backend.<你的前缀>.workers.dev`;

export const AXIOS_BASEURL =
  process.env.NODE_ENV === 'development'
    ? `/api`
    : `https://wedesk-backend.<你的前缀>.workers.dev`;
```

> **可选（配置 Cloudflare 官方免费 TURN 服务）：**
> 在 Cloudflare 控制台左侧进入 `Calls` -> `TURN Keys`，生成凭证并将 URL 填入 `src/constant.ts` 的 `COTURN_URL`。

---

### 5. 构建并发布 Web 端至 Cloudflare Pages

在项目根目录构建 Web 产物：
```bash
npm run build:prod
```
构建完成后会在根目录生成 `dist` 文件夹。通过 Wrangler 一键部署至 Pages：
```bash
npx wrangler pages deploy dist --project-name wedesk-web
```
发布成功后即可在浏览器中通过 Cloudflare 赠送的域名随时随地发起远程控制！

---

### 6. 打包受控端电脑客户端
在项目根目录执行打包命令：
```bash
npm run build:win
```
打出的 `.exe` 安装包将直接连接你刚刚部署好的 Cloudflare 边缘后端，安装在任意被控电脑上即可实现无人值守远控。
