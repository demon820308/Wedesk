<template>
  <div class="setting-wrap">
    <div class="nav-space"></div>
    <div class="container">
      <div class="page-title">设置</div>

      <!-- 画面与远程传输设置 -->
      <div class="setting-card">
        <div class="card-section-title">画面与传输设置</div>

        <div class="setting-item">
          <div class="item-label">
            <span class="main-txt">画质选择</span>
            <span class="sub-txt">选择远程控制时的图像清晰度与码率策略</span>
          </div>
          <div class="item-content">
            <div class="quality-options">
              <div
                class="quality-card"
                :class="{ active: cacheStore.quality === 'smooth' }"
                @click="cacheStore.quality = 'smooth'"
              >
                <div class="q-title">流畅</div>
                <div class="q-desc">720P / 2Mbps · 弱网优先</div>
              </div>
              <div
                class="quality-card"
                :class="{ active: cacheStore.quality === 'hd' }"
                @click="cacheStore.quality = 'hd'"
              >
                <div class="q-title">高清（推荐）</div>
                <div class="q-desc">1080P / 3Mbps · 平衡画质</div>
              </div>
              <div
                class="quality-card"
                :class="{ active: cacheStore.quality === 'ultra' }"
                @click="cacheStore.quality = 'ultra'"
              >
                <div class="q-title">超清</div>
                <div class="q-desc">1440P / 4Mbps · 极致细节</div>
              </div>
            </div>
          </div>
        </div>

        <div class="setting-item">
          <div class="item-label">
            <span class="main-txt">帧率控制</span>
            <span class="sub-txt">控制远程画面的刷新帧率</span>
          </div>
          <div class="item-content">
            <n-radio-group
              v-model:value="cacheStore.framerate"
              name="framerateGroup"
            >
              <n-space>
                <n-radio :value="30"> 30 fps (省流稳定) </n-radio>
                <n-radio :value="60"> 60 fps (丝滑高刷) </n-radio>
              </n-space>
            </n-radio-group>
          </div>
        </div>
      </div>

      <!-- 系统与基础设置 -->
      <div class="setting-card">
        <div class="card-section-title">系统与基础设置</div>

        <div
          v-if="ipcRenderer"
          class="setting-item"
        >
          <div class="item-label">
            <span class="main-txt">开机自启</span>
            <span class="sub-txt">计算机启动时自动在后台运行 Wedesk</span>
          </div>
          <div class="item-content">
            <n-switch
              v-model:value="cacheStore.autoStart"
              :round="true"
              @update:value="onAutoStartChange"
            />
          </div>
        </div>

        <div
          v-if="ipcRenderer"
          class="setting-item"
        >
          <div class="item-label">
            <span class="main-txt">窗口置顶</span>
            <span class="sub-txt">保持 Wedesk 客户端始终位于其他窗口上方</span>
          </div>
          <div class="item-content">
            <n-switch
              v-model:value="cacheStore.isAlwaysOnTop"
              :round="true"
            />
          </div>
        </div>
      </div>

      <!-- 接口与服务器配置 -->
      <div class="setting-card">
        <div class="card-section-title">接口与服务配置</div>

        <div class="setting-item">
          <div class="item-label">
            <span class="main-txt">信令与转发节点</span>
            <span class="sub-txt">当前连接的后端 WSS / Coturn 服务节点</span>
          </div>
          <div class="item-content urls-list">
            <div class="url-row">
              <span class="url-tag">WSS</span>
              <span
                class="url-text link"
                @click="handleCopy(getWssUrl() || WEBSOCKET_URL)"
              >
                {{ getWssUrl() || WEBSOCKET_URL }}
              </span>
            </div>
            <div class="url-row">
              <span class="url-tag">Coturn</span>
              <span
                class="url-text link"
                @click="handleCopy(getCoturnUrl() || COTURN_URL)"
              >
                {{ getCoturnUrl() || COTURN_URL }}
              </span>
            </div>
            <button
              class="btn-edit-url"
              @click="showUrlModalCpt = true"
            >
              修改节点配置
            </button>
          </div>
        </div>
      </div>

      <!-- 关于 Wedesk -->
      <div class="setting-card">
        <div class="card-section-title">关于 {{ PRODUCT_NAME }}</div>

        <div class="setting-item">
          <div class="item-label">
            <span class="main-txt">客户端版本</span>
            <span class="sub-txt"
              >v{{ appStore.version }} ({{ appStore.lastBuildDate }})</span
            >
          </div>
          <div class="item-content">
            <button
              v-if="ipcRenderer"
              class="btn-check-update"
              @click="handleDeskVersionCheck"
            >
              检查更新
            </button>
          </div>
        </div>
      </div>
    </div>

    <UrlModalCpt
      v-if="showUrlModalCpt"
      @close="showUrlModalCpt = false"
    ></UrlModalCpt>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';

import { fetchDeskVersionCheck } from '@/api/deskVersion';
import {
  COTURN_URL,
  PRODUCT_NAME,
  WEBSOCKET_URL,
  WINDOW_ID_ENUM,
} from '@/constant';
import { useIpcRendererSend } from '@/hooks/use-ipcRendererSend';
import { useAppStore } from '@/store/app';
import { usePiniaCacheStore } from '@/store/cache';
import { copyText, ipcRenderer } from '@/utils';
import { getCoturnUrl, getWssUrl } from '@/utils/localStorage/app';
import UrlModalCpt from '@/views/setting/urlModal.vue';

const appStore = useAppStore();
const cacheStore = usePiniaCacheStore();
const showUrlModalCpt = ref(false);

const {
  handlesetAlwaysOnTop,
  handleGetLoginItemSettings,
  handleSetLoginItemSettings,
} = useIpcRendererSend();

onMounted(async () => {
  if (ipcRenderer) {
    const isAuto = await handleGetLoginItemSettings();
    cacheStore.autoStart = isAuto;
  }
});

async function onAutoStartChange(val: boolean) {
  if (ipcRenderer) {
    const res = await handleSetLoginItemSettings(val);
    cacheStore.autoStart = res;
    if (res) {
      window.$message?.success?.('已开启开机自启');
    } else {
      window.$message?.info?.('已关闭开机自启');
    }
  }
}

watch(
  () => cacheStore.isAlwaysOnTop,
  () => {
    handlesetAlwaysOnTop({
      windowId: WINDOW_ID_ENUM.remote,
      flag: cacheStore.isAlwaysOnTop,
    });
  },
  { immediate: true }
);

async function handleCopy(str: string) {
  const ok = await copyText(str);
  if (ok) {
    window.$message?.success?.('复制成功！');
  } else {
    window.$message?.error?.('复制失败，请手动选中复制');
  }
}

async function handleDeskVersionCheck() {
  const res = await fetchDeskVersionCheck(appStore.version);
  if (res.code === 200 && res.data) {
    appStore.updateModalInfo = res.data;
    if (appStore.updateModalInfo?.checkUpdate === 2) {
      window.$message?.success?.('当前已是最新版本');
    } else if (appStore.updateModalInfo?.isUpdate === 2) {
      window.$message?.success?.('当前是最新版本');
    }
  }
}
</script>

<style lang="scss" scoped>
.setting-wrap {
  box-sizing: border-box;
  height: 100vh;
  overflow-y: auto;
  background-color: $cursor-canvas;

  @extend %customScrollbarHide;
  &:hover {
    @extend %customScrollbar;
  }

  .nav-space {
    height: $top-system-bar-height;
  }

  .container {
    max-width: 680px;
    margin: 0 auto;
    padding: 24px 32px 40px;

    .page-title {
      font-size: 20px;
      font-weight: 600;
      color: $cursor-ink;
      margin-bottom: 20px;
    }

    .setting-card {
      background-color: $cursor-surface-card;
      border: 1px solid $cursor-hairline;
      border-radius: $cursor-radius-lg;
      padding: 20px 24px;
      margin-bottom: 16px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);

      .card-section-title {
        font-size: 15px;
        font-weight: 600;
        color: $cursor-ink;
        margin-bottom: 16px;
        padding-bottom: 10px;
        border-bottom: 1px solid $cursor-hairline;
      }

      .setting-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 0;

        &:not(:last-child) {
          border-bottom: 1px dashed $cursor-hairline-soft;
        }

        .item-label {
          display: flex;
          flex-direction: column;
          gap: 4px;

          .main-txt {
            font-size: 14px;
            font-weight: 500;
            color: $cursor-ink;
          }

          .sub-txt {
            font-size: 12px;
            color: $cursor-muted;
          }
        }

        .item-content {
          .quality-options {
            display: flex;
            gap: 10px;

            .quality-card {
              box-sizing: border-box;
              padding: 8px 12px;
              border: 1px solid $cursor-hairline;
              border-radius: $cursor-radius-md;
              cursor: pointer;
              transition: all 0.2s ease;
              background-color: $cursor-canvas-soft;
              text-align: center;
              min-width: 100px;

              .q-title {
                font-size: 13px;
                font-weight: 600;
                color: $cursor-ink;
              }

              .q-desc {
                font-size: 11px;
                color: $cursor-muted;
                margin-top: 2px;
              }

              &:hover {
                border-color: $cursor-hairline-strong;
              }

              &.active {
                background-color: $cursor-surface-card;
                border-color: $cursor-primary;
                box-shadow: 0 0 0 1.5px $cursor-primary;

                .q-title {
                  color: $cursor-primary;
                }
              }
            }
          }

          &.urls-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
            align-items: flex-end;

            .url-row {
              display: flex;
              align-items: center;
              gap: 8px;

              .url-tag {
                font-size: 11px;
                font-weight: 600;
                padding: 1px 6px;
                border-radius: 4px;
                background-color: $cursor-canvas-soft;
                color: $cursor-muted;
              }

              .url-text {
                font-family: 'JetBrains Mono', monospace;
                font-size: 12px;
                color: $cursor-body;
                cursor: pointer;

                &:hover {
                  color: $cursor-primary;
                }
              }
            }

            .btn-edit-url {
              margin-top: 4px;
              padding: 4px 12px;
              border: 1px solid $cursor-hairline;
              border-radius: $cursor-radius-sm;
              background-color: transparent;
              color: $cursor-primary;
              font-size: 12px;
              cursor: pointer;

              &:hover {
                background-color: $cursor-canvas-soft;
              }
            }
          }

          .btn-check-update {
            padding: 6px 14px;
            border: 1px solid $cursor-hairline;
            border-radius: $cursor-radius-md;
            background-color: $cursor-surface-card;
            color: $cursor-ink;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;

            &:hover {
              background-color: $cursor-canvas-soft;
              border-color: $cursor-hairline-strong;
            }
          }
        }
      }
    }
  }
}
</style>
