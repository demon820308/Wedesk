# BilldDesk (v0.603.0+1) 逆向与架构分析报告

- **分析目标路径**：`D:\Program Files\BilldDesk`
- **主程序**：`BilldDesk.exe` (SHA-256: `b5f6954b976a211039adf588fe993d6318fc4d60dbbba53f0129926071779e7e`)
- **分析工具**：REA (Reverse Engineering Assistant) + 静态二进制分析
- **操作系统环境**：Windows x64

---

## 1. 软件架构概览

BilldDesk 是一款基于 **Flutter Desktop (Windows x64) + WebRTC + Windows 服务提权** 架构的远程控制软件。

```mermaid
graph TD
    UI[BilldDesk.exe<br/>Flutter 宿主程序] --> FE[flutter_windows.dll<br/>Flutter 引擎]
    UI --> AOT[data/app.so<br/>Dart AOT 业务逻辑]
    UI --> PLUGINS[插件矩阵<br/>billd_simulator, ib_input, window_manager 等]
    UI --> MEDIA[WebRTC & Codecs<br/>libwebrtc.dll, SVT-AV1, dav1d, aom]

    SVC[BilldDeskService.exe<br/>Windows 服务 (SYSTEM)] -->|Token 提权 / 穿透| SESS[用户会话 Session]
    SVC -->|启动守护| HELPER[billddesk_simulator_helper.exe<br/>安全桌面捕获切换]
    SVC -->|IPC 通信| UI

    HELPER -->|OpenInputDesktop| SECDESK[Winlogon / UAC 安全桌面]
```

---

## 2. 核心组件分析

### 2.1 主前端应用 (`BilldDesk.exe`)
- **二进制格式**：PE32+ (x86-64), 6 个 Section，无 CLI 托管头（原生 C++ 宿主）。
- **清单 (RT_MANIFEST)**：
  - `requestedExecutionLevel`: `asInvoker`
  - `dpiAwareness`: `PerMonitorV2`
- **运行时结构**：
  - `data\app.so`：ELF x86-64 格式的 Dart AOT 编译代码镜像。
  - `data\flutter_assets`：UI 静态资产与字体（`MiSans-Normal.ttf`、`MaterialIcons-Regular.otf`、`CupertinoIcons.ttf`）。
- **云端服务终结点**：
  - REST API：`https://desk-api.hsslive.cn`
  - WebSocket 信令：`wss://desk-api.hsslive.cn`（Socket.IO 协议）
  - 资源 CDN：`https://tencentcos-res.hsslive.cn`
  - 官网门户：`https://desk.hsslive.cn`

### 2.2 提权与会话管理服务 (`BilldDeskService.exe`)
- **运行身份**：`NT AUTHORITY\SYSTEM`。
- **注册方式**：由 `registerService.bat` 注册：
  ```bat
  sc create BilldDeskService binPath= "\"%~dp0BilldDeskService.exe\" --exepath=\"%~dp0BilldDesk.exe\" %args%" start= auto
  ```
- **核心行为**：
  - 会话监测：调用 `WTSGetActiveConsoleSessionId` 与 `WTSQuerySessionInformationW` 监听用户活动会话。
  - 令牌复制与特权赋予：调用 `OpenProcessToken`、`DuplicateTokenEx`，设置 `TokenUIAccess`。
  - 跨会话创建进程：调用 `CreateSystemDesktopProcess` 在用户会话（Session 1+）中拉起高权限进程，用以响应 UAC 弹窗和锁屏。
  - 通信支持：支持 `--wsPort` 参数进行本地 WebSocket 通信。
  - 日志记录：`C:\Windows\Temp\BilldDeskService.log`。

### 2.3 安全桌面捕获辅助进程 (`billddesk_simulator_helper.exe`)
- **核心行为**：
  - 调用 `OpenInputDesktop` 探测当前活动桌面是否处于安全桌面（Secure Desktop）或 Winlogon 状态。
  - 桌面切换捕获：当检测到切换时，触发 GDI/DXGI 捕获通道重定向（`GDI capture switching to input desktop` / `DXGI capture switching to input desktop`）。
  - 日志记录：`C:\Windows\Temp\billddesk_simulator_helper.log`。

### 2.4 输入仿真与隐私屏插件
- **`billd_simulator_plugin.dll`**：
  - 原始输入监听：注册 Windows Raw Input（`RIDEV_INPUTSINK`）。
  - 光标监听与提取：`CursorChangedEventProc`、`CreateMouseCursorFromHCursor`，将本地光标形状同步至远端。
  - 输入仿真与屏蔽：`localRelativeMouseMove`、`keyboardPress`、`startBlockingKeyboard`。
  - 隐私屏控制：`changePrivacyScreen`，配合根目录的 `BilldDeskPrivacyScreen.jpg` 实现被控端物理屏幕黑屏/遮罩。
- **`ib_input_simulator_plugin.dll`**：
  - 辅助绝对/相对鼠标与键盘事件模拟。

### 2.5 流媒体与音视频编解码矩阵
- **WebRTC 核心**：`flutter_webrtc_plugin.dll` + `libwebrtc.dll`（~20.5 MB）。
- **AV1 编解码器**：
  - `SvtAv1Enc.dll` (14.6 MB)：SVT-AV1 实时编码器。
  - `dav1d.dll` (1.78 MB)：高效率 AV1 解码器。
  - `aom.dll` (9.9 MB)：AOMedia 视频编解码库。
- **图像转换**：`libyuv.dll`、`avif.dll`、`libwebp*.dll`、`jpeg62.dll`、`fastfeat.dll`。

### 2.6 虚拟显示与配套组件
- **`parsec-vdd-0.41.0.0.exe`**：内置 Parsec Virtual Display Driver（虚拟显示驱动），用于在无显示器的云主机/虚拟机（Headless）上创建虚拟显示器。
- **`BilldDeskUpdate.exe`**：自动更新管理程序，日志记录于 `C:\Windows\Temp\UpdateService.log`。
- **`unins000.exe`**：Inno Setup 生成的标准卸载程序。

---

## 3. 安全与权限评估

1. **高权限常驻**：后台服务以 `SYSTEM` 权限常驻开机启动，并持有 `TokenUIAccess` 权限，具备接管用户交互和安全桌面的能力。
2. **凭据与信令**：信令走 WSS 加密传输至 `desk-api.hsslive.cn`，视频流走 WebRTC P2P/中继。
3. **输入设备接管**：插件注册了全局底层 Raw Input 与键盘拦截钩子，具备完整的按键/鼠标拦截与重放能力。
