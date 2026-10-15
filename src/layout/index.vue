<template>
  <div class="layout">
    <div
      v-if="useCustomBar"
      class="system-bar"
      data-tauri-drag-region
      :class="{ 'no-drag': !appStore.isMac, drag: appStore.isMac }"
      @mousedown="startMove"
      @mouseup="endMove"
      @mousemove="moving"
      @mouseleave="handleMouseleave"
    >
      <div class="top-left">
        <div class="brand-title">
          <span class="name">Wedesk</span>
          <span class="version">v{{ appStore.version }}</span>
        </div>
      </div>
      <div class="top-right">
        <div
          class="window-controls"
          @mousedown.stop
        >
          <div
            class="ico min"
            title="最小化"
            @click.stop="handleMin"
          >
            <div class="heng"></div>
          </div>
          <div
            class="ico max"
            :title="isMaximized ? '向下还原' : '最大化'"
            @click.stop="handleMax"
          >
            <div
              v-if="!isMaximized"
              class="fang"
            ></div>
            <div
              v-else
              class="restore"
            ></div>
          </div>
          <div
            class="ico close"
            title="关闭"
            @click.stop="handleClose"
          >
            <div class="corss"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="sidebar">
      <div class="user">
        <div class="dot"></div>
      </div>
      <div class="list">
        <div
          class="item"
          :class="{ active: route.name === routerName.host }"
          @click="router.push({ name: routerName.host })"
        >
          <svg
            class="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect
              x="2"
              y="3"
              width="20"
              height="14"
              rx="2"
              ry="2"
            ></rect>
            <line
              x1="8"
              y1="21"
              x2="16"
              y2="21"
            ></line>
            <line
              x1="12"
              y1="17"
              x2="12"
              y2="21"
            ></line>
            <path d="M12 7v5m0 0l-2-2m2 2l2-2"></path>
          </svg>
          <span>被控</span>
        </div>
        <div
          class="item"
          :class="{ active: route.name === routerName.remote }"
          @click="router.push({ name: routerName.remote })"
        >
          <svg
            class="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect
              x="2"
              y="3"
              width="20"
              height="14"
              rx="2"
              ry="2"
            ></rect>
            <line
              x1="8"
              y1="21"
              x2="16"
              y2="21"
            ></line>
            <line
              x1="12"
              y1="17"
              x2="12"
              y2="21"
            ></line>
            <path d="M12 12V7m0 0l-2 2m2-2l2 2"></path>
          </svg>
          <span>主控</span>
        </div>
        <div
          class="item"
          :class="{ active: route.name === routerName.deviceManage }"
          @click="router.push({ name: routerName.deviceManage })"
        >
          <svg
            class="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path
              d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
            ></path>
          </svg>
          <span>设备簿</span>
        </div>
        <div
          class="item"
          :class="{ active: route.name === routerName.setting }"
          @click="router.push({ name: routerName.setting })"
        >
          <svg
            class="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle
              cx="12"
              cy="12"
              r="3"
            ></circle>
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
            ></path>
          </svg>
          <span>设置</span>
        </div>
      </div>
    </div>
    <div class="view">
      <RouterView v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </RouterView>
    </div>
    <div
      class="debug-area"
      @click="handleOpenDebug"
    ></div>
    <div
      v-if="appStore.showDebug"
      class="debug-area-wrap"
    >
      <div
        class="item"
        @click="windowReload"
      >
        刷新
      </div>
      <div
        class="item"
        @click="handleOpenDevTools({ windowId: WINDOW_ID_ENUM.remote })"
      >
        控制台
      </div>
    </div>
    <UpdateModal
      v-if="
        appStore.updateModalInfo &&
        appStore.updateModalInfo?.checkUpdate === 1 &&
        appStore.updateModalInfo?.isUpdate === 1
      "
      @close="appStore.updateModalInfo.isUpdate = 2"
    ></UpdateModal>
    <DisableModal
      v-if="
        appStore.updateModalInfo &&
        appStore.updateModalInfo?.disableList.find(
          (v) => v.version === appStore.version
        )
      "
    ></DisableModal>
  </div>
</template>

<script lang="ts" setup>
import { getRandomString, windowReload } from 'billd-utils';
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { WINDOW_ID_ENUM } from '@/constant';
import { IPC_EVENT } from '@/event';
import { useHostService } from '@/hooks/use-hostService';
import { useIpcRendererSend } from '@/hooks/use-ipcRendererSend';
import { IIpcRendererData } from '@/interface';
import { routerName } from '@/router';
import { useAppStore } from '@/store/app';
import {
  ipcRenderer,
  ipcRendererInvoke,
  ipcRendererOn,
  ipcRendererSend,
} from '@/utils';
import {
  desktopStartDragging,
  desktopWindowClose,
  desktopWindowMinimize,
  desktopWindowToggleMaximize,
  isTauri,
} from '@/utils/desktopBridge';

const appStore = useAppStore();
const router = useRouter();
const route = useRoute();

const { handleOpenDevTools } = useIpcRendererSend();
const { initHost } = useHostService();

// 窗口当前的位置 + 鼠标当前的相对位置 - 鼠标以前的相对位置
const isMoving = ref<boolean>(false);
const lastPoint = reactive({ x: 0, y: 0 });
const useCustomBar = ref(true);
const clickNum = ref(1);

onMounted(() => {
  if (!ipcRenderer && !isTauri()) {
    useCustomBar.value = false;
  }
  if (isTauri()) {
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      const win = getCurrentWindow();
      win.isMaximized().then((max) => {
        isMaximized.value = max;
      });
      win.onResized(async () => {
        isMaximized.value = await win.isMaximized();
      });
    });
  }
  init();
  initHost();
});

async function init() {
  const res = await ipcRendererInvoke({
    windowId: WINDOW_ID_ENUM.remote,
    channel: IPC_EVENT.getPlatform,
    requestId: getRandomString(8),
    data: {},
  });
  if (res?.code === 0) {
    if (res?.data?.platform === 'darwin') {
      appStore.isMac = true;
    }
  }
}

ipcRendererOn(
  IPC_EVENT.response_open_about,
  (_event, data: IIpcRendererData) => {
    console.log('response_open_about', data);
    ipcRendererSend({
      windowId: 0,
      channel: IPC_EVENT.createWindow,
      requestId: getRandomString(8),
      data: {
        windowId: WINDOW_ID_ENUM.about,
        width: 550,
        height: 380,
        route: routerName.about,
        query: {},
        useWorkAreaSize: false,
        frame: true,
      },
    });
  }
);

ipcRendererOn(
  IPC_EVENT.response_open_version,
  (_event, data: IIpcRendererData) => {
    console.log('response_open_version', data);
    ipcRendererSend({
      windowId: 0,
      channel: IPC_EVENT.createWindow,
      requestId: getRandomString(8),
      data: {
        windowId: WINDOW_ID_ENUM.version,
        width: 300,
        height: 300,
        route: routerName.version,
        query: {},
        useWorkAreaSize: false,
        frame: true,
      },
    });
  }
);

function handleOpenDebug() {
  if (clickNum.value < 5) {
    clickNum.value += 1;
    setTimeout(() => {
      clickNum.value = 1;
    }, 3000);
  } else {
    appStore.showDebug = true;
  }
}

const isMaximized = ref(false);

function handleClose() {
  desktopWindowClose();
}

function handleMin() {
  desktopWindowMinimize();
}

async function handleMax() {
  if (isTauri()) {
    isMaximized.value = await desktopWindowToggleMaximize();
  } else {
    desktopWindowToggleMaximize();
  }
}

ipcRendererOn(
  IPC_EVENT.response_windowMaximize,
  (_event, data: IIpcRendererData) => {
    if (data?.data?.isMaximized !== undefined) {
      isMaximized.value = data.data.isMaximized;
    }
  }
);

const startMove = (e: MouseEvent) => {
  if (isTauri()) {
    desktopStartDragging();
    return;
  }
  if (appStore.isMac) {
    return;
  }
  isMoving.value = true;
  lastPoint.x = e.clientX;
  lastPoint.y = e.clientY;
};

const endMove = () => {
  if (isTauri() || appStore.isMac) {
    return;
  }
  isMoving.value = false;
};

const handleMouseleave = () => {
  if (isTauri() || appStore.isMac) {
    return;
  }
  isMoving.value = false;
};

const moving = (e: MouseEvent) => {
  if (isTauri() || appStore.isMac) {
    return;
  }
  if (isMoving.value) {
    ipcRendererInvoke({
      windowId: WINDOW_ID_ENUM.remote,
      channel: IPC_EVENT.setWindowPosition,
      requestId: getRandomString(8),
      data: {
        x: e.screenX - lastPoint.x,
        y: e.screenY - lastPoint.y,
      },
    });
  }
};
</script>

<style lang="scss" scoped>
$sidebar-width: 160px;
.layout {
  display: flex;
  box-sizing: border-box;
  width: 100vw;
  height: 100vh;
  .system-bar {
    position: fixed;
    top: 0;
    z-index: 999;
    display: flex;
    box-sizing: border-box;
    width: 100vw;
    height: $top-system-bar-height;
    &.drag {
      -webkit-app-region: drag;
    }
    &.no-drag {
      -webkit-app-region: no-drag;
    }

    user-select: none;
    .top-left {
      display: flex;
      align-items: center;
      box-sizing: border-box;
      padding: 0 16px;
      width: $sidebar-width;
      height: 100%;

      .brand-title {
        display: flex;
        align-items: baseline;
        gap: 6px;

        .name {
          color: $cursor-ink;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: -0.2px;
        }

        .version {
          color: $cursor-muted;
          font-size: 11px;
        }
      }
    }

    .top-right {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      box-sizing: border-box;
      padding-right: 14px;
      width: calc(100vw - $sidebar-width);
      height: 100%;

      .window-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        -webkit-app-region: no-drag;

        .ico {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            filter 0.15s ease;
          -webkit-app-region: no-drag;

          &:hover {
            filter: brightness(1.1);
            transform: scale(1.08);
          }

          &:active {
            transform: scale(0.95);
          }

          .heng {
            width: 7px;
            height: 1.5px;
            background-color: #1a1a1a;
          }

          .fang {
            width: 6px;
            height: 6px;
            border: 1px solid #1a1a1a;
            box-sizing: border-box;
          }

          .restore {
            position: relative;
            width: 5px;
            height: 5px;
            border: 1px solid #1a1a1a;
            box-sizing: border-box;

            &::after {
              content: '';
              position: absolute;
              top: -2px;
              right: -2px;
              width: 4px;
              height: 4px;
              border-top: 1px solid #1a1a1a;
              border-right: 1px solid #1a1a1a;
            }
          }

          .corss {
            width: 7px;
            height: 7px;

            @include cross(#1a1a1a, 1px);
          }

          &.min {
            background-color: #f6c84e;
          }

          &.max {
            background-color: #4cd964;
          }

          &.close {
            background-color: #f7564d;
          }
        }
      }
    }
  }
  .sidebar {
    box-sizing: border-box;
    padding: 60px 10px 0;
    width: $sidebar-width;
    height: 100vh;
    background-color: $cursor-canvas-soft;
    border-right: 1px solid $cursor-hairline;
    .user {
      position: relative;
      margin: 0 auto;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: 1px solid $cursor-hairline;

      @include setBackground('@/assets/img/billd.jpg');
      .dot {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 11px;
        height: 11px;
        border-radius: 50%;
        background-color: #1f8a65;
        border: 2px solid $cursor-surface-card;
      }
    }
    .list {
      padding-top: 20px;
      .item {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 6px;
        padding: 0 12px;
        height: 38px;
        border-radius: $cursor-radius-md;
        color: $cursor-body;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;

        .nav-icon {
          width: 17px;
          height: 17px;
          opacity: 0.65;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        &:hover {
          background-color: $cursor-hairline-soft;
          color: $cursor-ink;

          .nav-icon {
            opacity: 1;
          }
        }

        &.active {
          background-color: $cursor-surface-card;
          color: $cursor-primary;
          font-weight: 500;
          border: 1px solid $cursor-hairline;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

          .nav-icon {
            opacity: 1;
            stroke: $cursor-primary;
          }
        }
      }
    }
  }
  .view {
    box-sizing: border-box;
    width: calc(100vw - $sidebar-width);
    background-color: $cursor-canvas;
  }
  .debug-area {
    position: fixed;
    bottom: 0;
    left: 0;
    z-index: 300;
    width: 30px;
    height: 30px;
  }
  .debug-area-wrap {
    position: fixed;
    bottom: 40px;
    left: 0;
    z-index: 300;
    display: flex;
    .item {
      margin-right: 4px;
      color: red;
      font-size: 16px;
      cursor: pointer;
    }
  }
}
</style>
