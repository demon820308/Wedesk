<div align="center">
  <img src="readme_img/icon.png" alt="Wedesk" width="100" />
  <h1>Wedesk 远程桌面</h1>
  <p><strong>基于 Vue 3 + Tauri 2.0 (Rust) + WebRTC + Cloudflare 边缘计算的极简高性能跨平台远程桌面控制系统。</strong></p>
  <p>
    <a href="https://github.com/demon820308/Wedesk/releases/latest">下载安装包/便携版 v0.1.0</a> ·
    <a href="#核心功能特性">核心特性</a> ·
    <a href="#快速上手">快速上手</a> ·
    <a href="#cloudflare-边缘后端部署指引">Cloudflare 部署</a> ·
    <a href="#技术架构">技术架构</a> ·
    <a href="#-致谢与开源鸣谢">开源鸣谢</a> ·
    <a href="LICENSE.txt">开源协议</a>
  </p>
  <p>
    <a href="https://github.com/demon820308/Wedesk/releases/latest"><img src="https://img.shields.io/github/v/release/demon820308/Wedesk?color=orange&label=%E7%89%88%E6%9C%AC" alt="最新版本" /></a>
    <img src="https://img.shields.io/badge/%E7%89%88%E6%9C%AC-v0.1.0-green" alt="版本 v0.1.0" />
    <img src="https://img.shields.io/badge/%E5%B9%B3%E5%8F%B0-Windows%20x64%20%7C%20Web-blue" alt="Windows x64 | Web" />
    <img src="https://img.shields.io/badge/%E6%A1%86%E6%9E%B6-Tauri%202.0%20(Rust)%20%2B%20Vue%203-brightgreen" alt="Tauri 2.0 + Vue 3" />
    <a href="LICENSE.txt"><img src="https://img.shields.io/badge/%E5%BC%80%E6%BA%90%E5%8D%8F%E8%AE%AE-MIT-blue" alt="MIT" /></a>
  </p>
</div>

---

## ⚡ 原生极速 · 极致轻量 · 零服务器 Serverless 远控

| 🚀 原生极速 · 极致轻量 | 🎯 紧凑面板 · 双端自适应 | ☁️ 零服务器 · Cloudflare 托管 |
| :--- | :--- | :--- |
| 采用 **Tauri 2.0 (Rust)** 原生编译，安装包仅几兆，内存占用极低，极速秒启。 | 精心设计的左右双列控制面板，完美适配紧凑桌面视窗无溢出，支持设备代码与连接密码**一键复制**，直观清晰。 | 依托 **Cloudflare Workers + D1 + Durable Objects** 打造 100% Serverless 信令后端，无需购买 VPS，零运维成本。 |

数据流经 WebRTC 点对点直连（P2P DataChannel 与 MediaStream），低延迟传输，端到端私密安全。

---

## 🌟 核心功能特性

### 1. 🚀 基于 Tauri 2.0 深度原生重构
- **极小体积与极低内存**：使用 Rust 编译原生二进制应用，彻底剥离 Chromium 与 Node.js 臃肿环境，Windows 安装包及便携版体积大幅缩减。
- **底层原生事件捕获**：在 Rust 侧深度对接 Windows API，键盘与鼠标事件响应近乎零延迟。

### 2. 🎛️ 紧凑自适应受控面板（告别界面溢出）
- **左右双列并排排布**：「设备代码」与「连接密码」由上下堆叠重构为左右分栏排布，卡片整体纵向高度缩减超过 115px。
- **密码一键复制补全**：连接密码支持眼睛图标查看/隐藏，并新增一键快速复制按钮，方便将连接凭证快捷分享。
- **窗口自适应与防溢出**：完美契合 800×500 紧凑视窗，会话卡片连入后居中完整呈现，杜绝滚动条或边缘截断。

### 3. ⚡ 低延迟高清 WebRTC 串流控制
- **点对点直连（P2P）**：支持高帧率实时桌面画面采集，画质清晰流畅。
- **完整交互指令链路**：鼠标移动、左键/右键点击、拖拽、滚轮滚动与键盘全键位输入实时双向同步。
- **双向剪贴板同步**：主控端与受控端文本剪贴板自动互通。

### 4. ☁️ 全托管 Cloudflare Serverless 边缘架构
- **零服务器成本**：无须购置任何云服务器/ECS/VPS，信令传输与关系数据全部运行在 Cloudflare 全球边缘网络。
- **持久化设备管理**：通过 Cloudflare D1 Serverless SQLite 数据库管理设备号绑定与持久化状态。

---

## 📦 快速上手

### 方式一：Windows 桌面客户端（推荐日常使用）

无需配置 Node.js 或 Rust 开发环境，解压即用！

1. 在 [Releases 发布页面](https://github.com/demon820308/Wedesk/releases/latest) 下载：
   - **`wedesk-0.1.0-windows-x64.exe`**（标准安装程序）或
   - **`wedesk-0.1.0-windows-x64-portable.zip`**（绿色免安装便携版）；
2. 解压或安装后双击运行 **`Wedesk.exe`**；
3. 界面打开后，即可查看您的专属「设备代码」与「连接密码」；
4. 点击图标可一键复制设备代码或连接密码，或点击“一键复制邀请信息”分享给主控端即可发起协助。

---

### 方式二：开发者源码本地运行

如果您熟悉前端与 Rust 环境并希望进行二次开发：

```bash
# 1. 克隆代码仓库
git clone https://github.com/demon820308/Wedesk.git
cd Wedesk

# 2. 安装项目依赖
pnpm install

# 3. 启动 Web 前端调试（浏览器模式）
pnpm dev:web

# 4. 启动 Tauri 桌面端调试（需本地安装 Rust 工具链）
pnpm tauri dev

# 5. 构建本地桌面客户端产物
pnpm tauri build
```

---

## ☁️ Cloudflare 边缘后端部署指引

本项目在 `cloudflare/` 目录下提供了开箱即用的 **100% Serverless 边缘后端**，涵盖 WebSocket 实时信令、设备管理 API 与 SQLite 数据存储，无需任何服务器即可全球无缝直连。

### 架构组件
- **Web 主控前端**：Cloudflare Pages（免费 CDN 全球托管）
- **实时信令服务**：Cloudflare Workers + Durable Objects（长连接 WebSocket 状态中枢）
- **设备号与密码数据**：Cloudflare D1（Serverless SQLite 分布式数据库）
- **NAT 穿透与中继**：Cloudflare Calls / TURN 服务（或任意自建 Coturn）

---

### 详细部署步骤

#### 1. 登录 Cloudflare
确保本地已安装 Node.js，打开终端执行授权登录：
```bash
npx wrangler login
```
系统将自动打开浏览器，点击“允许”即可完成绑定。

#### 2. 创建并初始化 Cloudflare D1 数据库
进入 `cloudflare` 目录：
```bash
cd cloudflare
```
创建名为 `wedesk-db` 的数据库：
```bash
npx wrangler d1 create wedesk-db
```
执行成功后终端会返回类似如下配置信息：
```toml
database_name = "wedesk-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```
打开 `cloudflare/wrangler.toml` 文件，将其中的 `database_id` 替换为你刚刚生成的实际 ID：
```toml
[[d1_databases]]
binding = "DB"
database_name = "wedesk-db"
database_id = "你的database_id"
```
接着在云端执行 SQL 结构初始化：
```bash
npx wrangler d1 execute wedesk-db --file=./schema.sql --remote
```

#### 3. 一键部署后端 Worker 信令服务
在 `cloudflare` 目录下执行：
```bash
npx wrangler deploy
```
部署成功后，终端将输出专属的 Worker 服务公网域名，例如：
`https://wedesk-backend.<你的账号域>.workers.dev`

#### 4. 配置客户端连接私有公网信令服务

##### 方式 A：Windows 桌面客户端直接配置（无需编译代码，普通用户推荐）
如果您直接下载并使用了 Releases 页面提供的桌面客户端安装包或便携版，可直接在图形界面内完成切换：
1. 启动 Wedesk 客户端，点击左侧导航栏的 **「设置」**；
2. 找到 **「接口与服务配置」** 区域，在 **「信令与转发节点」** 旁点击 **「修改节点配置」**；
3. 在弹窗中成对填入您部署的 Cloudflare 节点：
   - **`wss`**：填写 WebSocket 信令地址，例如 `wss://wedesk-backend.<你的账号域>.workers.dev`（或自绑定的域名如 `wss://wedesk.yourdomain.com`）；
   - **`axios`**：填写 HTTP 接口地址，例如 `https://wedesk-backend.<你的账号域>.workers.dev`（或自绑定的域名如 `https://wedesk.yourdomain.com`）；
   - **`coturn`**：穿透中继节点。客户端默认内置了 5 个免费公开的 STUN 打洞节点（含 Cloudflare / Google / 腾讯等），绝大多数网络环境下**直接留空**即可正常实现 P2P 直连远控；
4. 点击 **「确定」** 保存后，**完全退出并重新启动 Wedesk 客户端**，即可无缝接入您专属的私有信令网络！

> **📌 关键提示**：
> 1. **必须成对填写**：Cloudflare Worker 同时处理信令（WSS）和接口（Axios），请同时配置 `wss` 与 `axios` 两个字段，避免请求分离；
> 2. **必须重启客户端**：网络实例与长连接在程序启动时初始化，保存本地配置后须重启程序以加载新节点。

##### 方式 B：开发者源码二次编译
如果您希望直接把自己的域名固化为客户端默认地址并自行打包：
打开项目中的 `src/constant.ts`，修改默认域名：
```typescript
export const WEBSOCKET_URL =
  process.env.NODE_ENV === 'development'
    ? `ws://localhost:4300`
    : `wss://wedesk-backend.<你的账号域>.workers.dev`;

export const AXIOS_BASEURL =
  process.env.NODE_ENV === 'development'
    ? `/api`
    : `https://wedesk-backend.<你的账号域>.workers.dev`;
```

#### 5. （可选）一键部署 Web 主控端至 Cloudflare Pages
在项目根目录下构建纯前端产物并一键部署至 Pages：
```bash
# 构建前端生产产物
pnpm run build:prod

# 一键推送至 Cloudflare Pages 托管
npx wrangler pages deploy dist --project-name wedesk-web
```
部署完成后即可通过分配的 Pages 网址直接在手机或任何浏览器上随时随地远程控制电脑。

---

## 🏗️ 技术架构

```text
┌────────────────────────────────────────────────────────┐
│                   Wedesk Client                        │
│  ┌───────────────────────┐   ┌──────────────────────┐  │
│  │   Vue 3 + Naive UI    │   │   Tauri 2.0 (Rust)   │  │
│  │  (Cursor 风格控制面板) │   │ (原生系统 API / 键鼠) │  │
│  └───────────┬───────────┘   └───────────┬──────────┘  │
└──────────────┼───────────────────────────┼─────────────┘
               │ WebRTC P2P (音视频 / 键鼠)  │
               ▼                           ▼
┌────────────────────────────────────────────────────────┐
│             Cloudflare Serverless 边缘后端             │
│  ┌───────────────────────┐   ┌──────────────────────┐  │
│  │ Cloudflare Workers    │   │ Cloudflare D1 (DB)   │  │
│  │ + Durable Objects     │   │ (设备信息 / 鉴权校验) │  │
│  │ (WebSocket 信令中枢)   │   │                      │  │
│  └───────────────────────┘   └──────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 🙏 致谢与开源鸣谢

本项目基于 [galaxy-s10/billd-desk](https://github.com/galaxy-s10/billd-desk) 进行二次开发与架构重构（剥离 Electron 全面转向 Tauri 2.0 原生架构与 Cloudflare Serverless 边缘网络）。

衷心感谢原作者 [@galaxy-s10](https://github.com/galaxy-s10) 提供优秀的开源源码与贡献支持！

---

## 📄 开源协议

本项目基于 [MIT 许可证](LICENSE.txt) 开源发布。
