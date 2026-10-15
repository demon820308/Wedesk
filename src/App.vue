<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider :max="3">
      <n-modal-provider>
        <n-dialog-provider>
          <router-view></router-view>
          <NaiveModal />
          <NaiveMessage />
        </n-dialog-provider>
      </n-modal-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script lang="ts" setup>
import { GlobalThemeOverrides, NConfigProvider } from 'naive-ui';
import { onMounted } from 'vue';

import {
  fetchDeskVersionByVersion,
  fetchDeskVersionCheck,
  fetchDeskVersionLatest,
} from '@/api/deskVersion';
import { APP_BUILD_INFO, WINDOW_ID_ENUM } from '@/constant';
import { useIpcRendererSend } from '@/hooks/use-ipcRendererSend';
import { useAppStore } from '@/store/app';
import { usePiniaCacheStore } from '@/store/cache';
import { ipcRenderer } from '@/utils';

const appStore = useAppStore();
const cacheStore = usePiniaCacheStore();

const { handlesetAlwaysOnTop, handleOpenDevTools } = useIpcRendererSend();
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#f54e00',
    primaryColorHover: '#d04200',
    primaryColorPressed: '#b83a00',
    primaryColorSuppl: '#f54e00',
    textColorBase: '#26251e',
    textColor1: '#26251e',
    textColor2: '#5a5852',
    textColor3: '#807d72',
    borderRadius: '8px',
    borderColor: '#e6e5e0',
    cardColor: '#ffffff',
    bodyColor: '#f7f7f4',
  },
  Button: {
    borderRadiusMedium: '8px',
    borderRadiusSmall: '6px',
    borderRadiusLarge: '8px',
    colorPrimary: '#f54e00',
    colorHoverPrimary: '#d04200',
    colorPressedPrimary: '#b83a00',
    colorFocusPrimary: '#d04200',
    textColorPrimary: '#ffffff',
  },
  Input: {
    borderRadius: '8px',
    border: '1px solid #e6e5e0',
    borderHover: '1px solid #cfcdc4',
    borderFocus: '1px solid #f54e00',
    boxShadowFocus: '0 0 0 2px rgba(245, 78, 0, 0.1)',
  },
};

onMounted(() => {
  console.log('当前地址栏', location.href);
  appStore.version = APP_BUILD_INFO?.pkgVersion || '0.0.1';
  appStore.lastBuildDate = APP_BUILD_INFO?.lastBuildDate || '';
  handlesetAlwaysOnTop({
    windowId: WINDOW_ID_ENUM.remote,
    flag: cacheStore.isAlwaysOnTop,
  });
  getClient();
  if (ipcRenderer) {
    handleOpenDevTools({ windowId: WINDOW_ID_ENUM.remote });
    handleDeskVersionCheck();
  }
});

async function handleDeskVersionCheck() {
  try {
    const res = await fetchDeskVersionCheck(appStore.version);
    if (res.code === 200 && res.data) {
      appStore.updateModalInfo = res.data;
    }
  } catch (error) {
    console.log(error);
  }
}

async function getClient() {
  try {
    let res;
    if (ipcRenderer) {
      res = await fetchDeskVersionByVersion(appStore.version);
    } else {
      res = await fetchDeskVersionLatest();
    }
    if (res.code === 200 && res.data) {
      appStore.deskVersionInfo = res.data;
    }
  } catch (error) {
    console.log(error);
  }
}
</script>

<style lang="scss" scoped></style>

<style lang="scss">
#app {
  user-select: none;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;
  color: #26251e;
  background-color: #f7f7f4;
}
</style>
