use tauri::{
    ipc::Response,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use windows_sys::Win32::Graphics::Gdi::{
    BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC, GetDIBits,
    ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, SRCCOPY,
};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    DrawIcon, GetCursorInfo, GetSystemMetrics, CURSORINFO, CURSOR_SHOWING, SM_CXSCREEN, SM_CYSCREEN,
};

#[tauri::command]
async fn open_remote_window(app: tauri::AppHandle, url: String) -> Result<(), String> {
    let win_label = format!(
        "remote-viewer-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    );

    let webview_url = if let Ok(parsed) = tauri::Url::parse(&url) {
        tauri::WebviewUrl::External(parsed)
    } else {
        tauri::WebviewUrl::App(url.into())
    };

    tauri::WebviewWindowBuilder::new(&app, &win_label, webview_url)
        .title("Wedesk 远程协助 - 监控视窗")
        .inner_size(1280.0, 720.0)
        .min_inner_size(640.0, 360.0)
        .decorations(true)
        .build()
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn capture_screen_frame(quality: Option<u8>) -> Result<Response, String> {
    #[cfg(windows)]
    unsafe {
        let screen_w = GetSystemMetrics(SM_CXSCREEN);
        let screen_h = GetSystemMetrics(SM_CYSCREEN);
        if screen_w <= 0 || screen_h <= 0 {
            return Err("Invalid screen dimensions".to_string());
        }

        let hdc_screen = GetDC(std::ptr::null_mut());
        if hdc_screen.is_null() {
            return Err("Failed to get screen DC".to_string());
        }

        let hdc_mem = CreateCompatibleDC(hdc_screen);
        if hdc_mem.is_null() {
            ReleaseDC(std::ptr::null_mut(), hdc_screen);
            return Err("Failed to create compatible DC".to_string());
        }

        let hbitmap = CreateCompatibleBitmap(hdc_screen, screen_w, screen_h);
        if hbitmap.is_null() {
            DeleteDC(hdc_mem);
            ReleaseDC(std::ptr::null_mut(), hdc_screen);
            return Err("Failed to create compatible bitmap".to_string());
        }

        let old_bitmap = SelectObject(hdc_mem, hbitmap);
        BitBlt(hdc_mem, 0, 0, screen_w, screen_h, hdc_screen, 0, 0, SRCCOPY);

        let mut cursor_info: CURSORINFO = std::mem::zeroed();
        cursor_info.cbSize = std::mem::size_of::<CURSORINFO>() as u32;
        if GetCursorInfo(&mut cursor_info) != 0 && (cursor_info.flags & CURSOR_SHOWING) != 0 {
            DrawIcon(
                hdc_mem,
                cursor_info.ptScreenPos.x,
                cursor_info.ptScreenPos.y,
                cursor_info.hCursor,
            );
        }

        let mut bi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: screen_w,
                biHeight: -screen_h,
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB,
                biSizeImage: (screen_w * screen_h * 4) as u32,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [windows_sys::Win32::Graphics::Gdi::RGBQUAD {
                rgbBlue: 0,
                rgbGreen: 0,
                rgbRed: 0,
                rgbReserved: 0,
            }],
        };

        let mut bgra_buf: Vec<u8> = vec![0u8; (screen_w * screen_h * 4) as usize];
        GetDIBits(
            hdc_mem,
            hbitmap,
            0,
            screen_h as u32,
            bgra_buf.as_mut_ptr() as *mut _,
            &mut bi,
            DIB_RGB_COLORS,
        );

        SelectObject(hdc_mem, old_bitmap);
        DeleteObject(hbitmap);
        DeleteDC(hdc_mem);
        ReleaseDC(std::ptr::null_mut(), hdc_screen);

        let q = quality.unwrap_or(75).clamp(10, 100);
        let mut jpeg_buf = Vec::with_capacity(128 * 1024);
        let encoder = jpeg_encoder::Encoder::new(&mut jpeg_buf, q);
        encoder
            .encode(
                &bgra_buf,
                screen_w as u16,
                screen_h as u16,
                jpeg_encoder::ColorType::Bgra,
            )
            .map_err(|e| e.to_string())?;

        Ok(Response::new(jpeg_buf))
    }
    #[cfg(not(windows))]
    {
        Err("Unsupported platform".to_string())
    }
}

#[cfg(windows)]
extern "system" {
    fn SetCursorPos(x: i32, y: i32) -> i32;
    fn mouse_event(dw_flags: u32, dx: u32, dy: u32, dw_data: u32, dw_extra_info: usize);
    fn keybd_event(b_vk: u8, b_scan: u8, dw_flags: u32, dw_extra_info: usize);
}

#[derive(serde::Deserialize)]
pub struct InputPayload {
    pub action: serde_json::Value,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub amount: Option<i32>,
    pub key: Option<serde_json::Value>,
}

#[tauri::command]
fn simulate_input(payload: InputPayload) -> Result<(), String> {
    #[cfg(windows)]
    unsafe {
        let screen_w = GetSystemMetrics(0);
        let screen_h = GetSystemMetrics(1);

        if let (Some(px), Some(py)) = (payload.x, payload.y) {
            let abs_x = ((px / 1000.0) * (screen_w as f64)) as i32;
            let abs_y = ((py / 1000.0) * (screen_h as f64)) as i32;
            SetCursorPos(abs_x, abs_y);
        }

        let action_str = match &payload.action {
            serde_json::Value::String(s) => s.clone(),
            serde_json::Value::Number(n) => match n.as_i64().unwrap_or(-1) {
                0 => "mouseMove".to_string(),
                1 => "mouseDrag".to_string(),
                2 => "pressButtonLeft".to_string(),
                3 => "pressButtonRight".to_string(),
                4 => "releaseButtonLeft".to_string(),
                5 => "releaseButtonRight".to_string(),
                6 => "setPosition".to_string(),
                7 => "doubleClick".to_string(),
                8 => "leftClick".to_string(),
                9 => "rightClick".to_string(),
                10 => "scrollDown".to_string(),
                11 => "scrollUp".to_string(),
                14 => "keyboardType".to_string(),
                15 => "keyboardPressKey".to_string(),
                16 => "keyboardReleaseKey".to_string(),
                _ => String::new(),
            },
            _ => String::new(),
        };

        let key_str = match &payload.key {
            Some(serde_json::Value::String(s)) => Some(s.clone()),
            Some(serde_json::Value::Array(arr)) => {
                arr.first().and_then(|v| v.as_str().map(|s| s.to_string()))
            }
            _ => None,
        };

        match action_str.as_str() {
            "mouseMove" | "setPosition" | "mouseDrag" => {}
            "leftClick" => {
                mouse_event(0x0002, 0, 0, 0, 0); // MOUSEEVENTF_LEFTDOWN
                mouse_event(0x0004, 0, 0, 0, 0); // MOUSEEVENTF_LEFTUP
            }
            "rightClick" => {
                mouse_event(0x0008, 0, 0, 0, 0); // MOUSEEVENTF_RIGHTDOWN
                mouse_event(0x0010, 0, 0, 0, 0); // MOUSEEVENTF_RIGHTUP
            }
            "doubleClick" => {
                mouse_event(0x0002, 0, 0, 0, 0);
                mouse_event(0x0004, 0, 0, 0, 0);
                mouse_event(0x0002, 0, 0, 0, 0);
                mouse_event(0x0004, 0, 0, 0, 0);
            }
            "pressButtonLeft" => {
                mouse_event(0x0002, 0, 0, 0, 0);
            }
            "releaseButtonLeft" => {
                mouse_event(0x0004, 0, 0, 0, 0);
            }
            "pressButtonRight" => {
                mouse_event(0x0008, 0, 0, 0, 0);
            }
            "releaseButtonRight" => {
                mouse_event(0x0010, 0, 0, 0, 0);
            }
            "scrollDown" => {
                let amt = payload.amount.unwrap_or(120);
                mouse_event(0x0800, 0, 0, (-(amt as i32)) as u32, 0); // MOUSEEVENTF_WHEEL
            }
            "scrollUp" => {
                let amt = payload.amount.unwrap_or(120);
                mouse_event(0x0800, 0, 0, amt as u32, 0);
            }
            "keyboardType" => {
                if let Some(s) = key_str {
                    for b in s.bytes() {
                        keybd_event(b, 0, 0, 0);
                        keybd_event(b, 0, 2, 0); // KEYEVENTF_KEYUP
                    }
                }
            }
            "keyboardPressKey" => {
                if let Some(s) = key_str {
                    if let Some(b) = s.bytes().next() {
                        keybd_event(b, 0, 0, 0);
                    }
                }
            }
            "keyboardReleaseKey" => {
                if let Some(s) = key_str {
                    if let Some(b) = s.bytes().next() {
                        keybd_event(b, 0, 2, 0); // KEYEVENTF_KEYUP
                    }
                }
            }
            _ => {}
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            open_remote_window,
            simulate_input,
            capture_screen_frame
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let show_i = MenuItem::with_id(app, "show", "显示主界面", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "退出 Wedesk", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            if let Some(icon) = app.default_window_icon() {
                let _tray = TrayIconBuilder::new()
                    .icon(icon.clone())
                    .tooltip("Wedesk 远程桌面")
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "show" => {
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.show();
                                let _ = win.unminimize();
                                let _ = win.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(win) = app.get_webview_window("main") {
                                if win.is_visible().unwrap_or(false) {
                                    let _ = win.hide();
                                } else {
                                    let _ = win.show();
                                    let _ = win.unminimize();
                                    let _ = win.set_focus();
                                }
                            }
                        }
                    })
                    .build(app)?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
