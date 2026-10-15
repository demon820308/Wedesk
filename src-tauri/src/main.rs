// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
  #[cfg(windows)]
  {
    // 静默屏幕捕获参数：跳过 W3C getDisplayMedia 弹出的“选择共享内容”面板，直接静默捕获全屏
    std::env::set_var(
      "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
      "--enable-usermedia-screen-capturing --auto-select-desktop-capture-source=\"整个屏幕\" --auto-select-desktop-capture-source=\"Entire screen\"",
    );
  }

  app_lib::run();
}
