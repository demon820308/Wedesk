<template>
  <div class="host-wrap">
    <div class="nav-space"></div>
    <div class="container">
      <div class="card main-card">
        <div class="card-header">
          <div class="title">允许远程本机</div>
          <n-switch
            v-model:value="cacheStore.allowControl"
            :round="true"
          />
        </div>

        <div class="divider"></div>

        <div class="grid-sections">
          <div class="card-section">
            <div class="field-label">设备代码</div>
            <div class="code-row">
              <div class="code-val">{{ formattedDeviceUuid }}</div>
              <div class="actions">
                <div
                  class="btn-icon copy"
                  title="复制设备代码"
                  @click="
                    handleCopy(cacheStore.deskUserUuid, '已复制设备代码！')
                  "
                ></div>
                <div
                  class="btn-icon refresh"
                  title="重新生成设备代码"
                  @click="handleResetDeskuuid"
                ></div>
              </div>
            </div>
          </div>

          <div class="col-divider"></div>

          <div class="card-section">
            <div class="field-label">连接密码</div>
            <div class="code-row">
              <div class="code-val pwd">
                {{
                  cacheStore.hidePwd ? '••••••' : cacheStore.deskUserPassword
                }}
              </div>
              <div class="actions">
                <div
                  class="btn-icon copy"
                  title="复制连接密码"
                  @click="
                    handleCopy(cacheStore.deskUserPassword, '已复制连接密码！')
                  "
                ></div>
                <div
                  class="btn-icon eye"
                  :class="{ hide: cacheStore.hidePwd }"
                  :title="cacheStore.hidePwd ? '显示密码' : '隐藏密码'"
                  @click="cacheStore.hidePwd = !cacheStore.hidePwd"
                ></div>
                <div
                  class="btn-icon refresh"
                  title="刷新临时密码"
                  @click="handleUpdatePassword"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="status-bar">
        <div
          class="status-indicator"
          :class="{
            active: cacheStore.allowControl,
            disabled: !cacheStore.allowControl,
          }"
        >
          <span class="dot"></span>
          <span class="status-text">
            {{
              cacheStore.allowControl
                ? '已准备好连接'
                : '远程控制已关闭（他人无法连接此设备）'
            }}
          </span>
        </div>
        <button
          class="btn-copy-all"
          @click="handleCopyRemoteInfo"
        >
          一键复制邀请信息
        </button>
      </div>

      <!-- 当前被控状态与活动连接 -->
      <div
        v-if="activeSessions.length"
        class="card active-sessions"
      >
        <div class="session-title">正在进行的远程会话</div>
        <div
          v-for="[key, item] in activeSessions"
          :key="key"
          class="session-item"
        >
          <div class="session-info">
            <span class="pulse-dot"></span>
            <span
              >设备 {{ item.deskUserUuid || item.sender }} 正在控制本机</span
            >
          </div>
          <button
            class="btn-disconnect"
            @click="handleDel(item.sender)"
          >
            断开连接
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import { useHostService } from '@/hooks/use-hostService';
import { useAppStore } from '@/store/app';
import { usePiniaCacheStore } from '@/store/cache';

const appStore = useAppStore();
const cacheStore = usePiniaCacheStore();
const {
  formattedDeviceUuid,
  handleResetDeskuuid,
  handleUpdatePassword,
  handleCopy,
  handleCopyRemoteInfo,
  handleDel,
} = useHostService();

const activeSessions = computed(() => {
  const list: [string, any][] = [];
  appStore.remoteDesk.forEach((session, key) => {
    if (!session.isClose) {
      list.push([key, session]);
    }
  });
  return list;
});
</script>

<style lang="scss" scoped>
.host-wrap {
  box-sizing: border-box;
  height: 100vh;
  background-color: $cursor-canvas;
  overflow-y: auto;

  .nav-space {
    height: $top-system-bar-height;
  }

  .container {
    max-width: 560px;
    margin: 0 auto;
    padding: 18px 28px 24px;
  }

  .card {
    background-color: $cursor-surface-card;
    border: 1px solid $cursor-hairline;
    border-radius: $cursor-radius-lg;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  }

  .main-card {
    padding: 16px 22px;

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .title {
        font-size: 16px;
        font-weight: 600;
        color: $cursor-ink;
      }
    }

    .divider {
      margin: 12px 0 14px;
      height: 1px;
      background-color: $cursor-hairline;
    }

    .grid-sections {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;

      .card-section {
        flex: 1;
        min-width: 0;

        .field-label {
          font-size: 12px;
          color: $cursor-muted;
          margin-bottom: 4px;
          font-weight: 500;
        }

        .code-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;

          .code-val {
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            font-size: 22px;
            font-weight: 700;
            color: $cursor-primary;
            letter-spacing: 1px;
            user-select: text;
            white-space: nowrap;

            &.pwd {
              font-size: 20px;
              color: $cursor-ink;
              letter-spacing: 2px;
            }
          }

          .actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;

            .btn-icon {
              width: 19px;
              height: 19px;
              cursor: pointer;
              opacity: 0.65;
              transition: all 0.2s ease;

              &:hover {
                opacity: 1;
                transform: scale(1.1);
              }

              &.copy {
                @include setBackground('@/assets/img/copy.png');
              }
              &.refresh {
                @include setBackground('@/assets/img/refresh.png');
              }
              &.eye {
                @include setBackground('@/assets/img/view.png');
                &.hide {
                  @include setBackground('@/assets/img/view_off.png');
                }
              }
            }
          }
        }
      }

      .col-divider {
        width: 1px;
        height: 44px;
        background-color: $cursor-hairline-soft;
        flex-shrink: 0;
      }
    }
  }

  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 14px;
    padding: 0 4px;

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      &.active {
        color: #1f8a65;
        .dot {
          background-color: #1f8a65;
          box-shadow: 0 0 0 3px rgba(31, 138, 101, 0.2);
        }
      }

      &.disabled {
        color: $cursor-muted;
        .dot {
          background-color: $cursor-muted-soft;
        }
      }
    }

    .btn-copy-all {
      border: 1px solid $cursor-hairline;
      background-color: $cursor-surface-card;
      color: $cursor-body;
      font-size: 12px;
      padding: 6px 14px;
      border-radius: $cursor-radius-md;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background-color: $cursor-canvas-soft;
        color: $cursor-ink;
        border-color: $cursor-hairline-strong;
      }
    }
  }

  .active-sessions {
    margin-top: 16px;
    padding: 14px 18px;
    border-left: 4px solid $cursor-primary;

    .session-title {
      font-size: 14px;
      font-weight: 600;
      color: $cursor-ink;
      margin-bottom: 12px;
    }

    .session-item {
      display: flex;
      align-items: center;
      justify-content: space-between;

      .session-info {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: $cursor-body;

        .pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #f54e00;
          animation: pulse 1.5s infinite;
        }
      }

      .btn-disconnect {
        padding: 4px 12px;
        background-color: #ffe9e5;
        color: #d04200;
        border: 1px solid rgba(208, 66, 0, 0.2);
        border-radius: $cursor-radius-sm;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background-color: #d04200;
          color: #fff;
        }
      }
    }
  }
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(245, 78, 0, 0.7);
  }
  70% {
    transform: scale(1.1);
    box-shadow: 0 0 0 6px rgba(245, 78, 0, 0);
  }
  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(245, 78, 0, 0);
  }
}
</style>
