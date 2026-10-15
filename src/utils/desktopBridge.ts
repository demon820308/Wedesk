import { getRandomString } from 'billd-utils';

import { WINDOW_ID_ENUM } from '@/constant';
import { IPC_EVENT } from '@/event';
import router, { routerName } from '@/router';
import { ipcRenderer, ipcRendererSend } from '@/utils';

export const isTauri = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  );
};

export const isElectron = (): boolean => {
  return !!ipcRenderer;
};

/**
 * 跨运行时窗口最小化
 */
export async function desktopWindowMinimize() {
  if (isTauri()) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch (e) {
      console.error('Tauri minimize error:', e);
    }
  } else if (isElectron()) {
    ipcRendererSend({
      windowId: WINDOW_ID_ENUM.remote,
      channel: IPC_EVENT.windowMinimize,
      requestId: getRandomString(8),
      data: {},
    });
  }
}

/**
 * 跨运行时窗口最大化 / 还原
 */
export async function desktopWindowToggleMaximize(): Promise<boolean> {
  if (isTauri()) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().toggleMaximize();
      return await getCurrentWindow().isMaximized();
    } catch (e) {
      console.error('Tauri toggleMaximize error:', e);
      return false;
    }
  } else if (isElectron()) {
    ipcRendererSend({
      windowId: WINDOW_ID_ENUM.remote,
      channel: IPC_EVENT.windowMaximize,
      requestId: getRandomString(8),
      data: {},
    });
    return false;
  }
  return false;
}

/**
 * 跨运行时窗口关闭（隐藏到系统托盘）
 */
export async function desktopWindowClose() {
  if (isTauri()) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().hide();
    } catch (e) {
      console.error('Tauri hide error:', e);
    }
  } else if (isElectron()) {
    ipcRendererSend({
      windowId: WINDOW_ID_ENUM.remote,
      channel: IPC_EVENT.closeAllWindow,
      requestId: getRandomString(8),
      data: {},
    });
  }
}

/**
 * 跨运行时原生拖拽窗口
 */
export async function desktopStartDragging() {
  if (isTauri()) {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().startDragging();
    } catch (e) {
      console.error('Tauri startDragging error:', e);
    }
  }
}

/**
 * 跨运行时打开远程桌面独立监视器窗口
 */
export async function desktopOpenRemoteWindow(params: Record<string, any>) {
  const queryStr = new URLSearchParams(
    Object.entries(params).reduce(
      (acc, [k, v]) => {
        if (v !== undefined && v !== null) acc[k] = String(v);
        return acc;
      },
      {} as Record<string, string>
    )
  ).toString();

  const url = `${window.location.origin}/#/webrtc?${queryStr}`;

  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_remote_window', { url });
    } catch (e) {
      console.error(
        'Tauri open_remote_window error, fallback to window.open:',
        e
      );
      window.open(url, '_blank', 'width=1280,height=720');
    }
  } else if (isElectron()) {
    ipcRendererSend({
      windowId: 0,
      channel: IPC_EVENT.createWindow,
      requestId: getRandomString(8),
      data: {
        route: 'webrtc',
        query: params,
        windowId: WINDOW_ID_ENUM.webrtc,
        minWidth: 300,
        minHeight: 300,
        useWorkAreaSize: true,
        frame: true,
      },
    });
  } else {
    router.push({
      name: routerName.webrtc,
      query: params,
    });
  }
}
