<template>
  <div class="controller-wrap">
    <div class="nav-space"></div>
    <div class="container">
      <!-- 主控输入卡片 -->
      <div class="card connect-card">
        <div class="card-title">远程协助</div>
        <div class="form-group">
          <div class="input-item">
            <input
              v-model="inputUuid"
              type="text"
              class="text-input code-input"
              placeholder="请输入远程设备代码"
              maxlength="11"
              autofocus
              @keydown.enter="handleEnterKey"
              @input="handleUuidInput"
            />
          </div>

          <div class="input-item pwd-input-item">
            <input
              v-model="inputPassword"
              :type="hidePassword ? 'password' : 'text'"
              class="text-input"
              placeholder="请输入连接密码（选填/自动填充）"
              maxlength="20"
              @keydown.enter="startRemote"
            />
            <div
              class="btn-icon eye"
              :class="{ hide: hidePassword }"
              :title="hidePassword ? '显示密码' : '隐藏密码'"
              @click="hidePassword = !hidePassword"
            ></div>
          </div>

          <button
            class="btn-connect"
            :class="{ disabled: !inputUuid.trim().length, loading }"
            :disabled="!inputUuid.trim().length || loading"
            @click="startRemote"
          >
            <span v-if="!loading">连接</span>
            <span
              v-else
              class="loading-spin"
            ></span>
          </button>
        </div>
      </div>

      <!-- 最近连接快捷入口 -->
      <div class="recent-section">
        <div class="section-header">
          <div class="title">最近连接</div>
          <span class="count">{{ recentList.length }} 台设备</span>
        </div>

        <div
          v-if="!recentList.length"
          class="card empty-card"
        >
          <div class="empty-text">暂无最近连接记录</div>
          <div class="empty-sub">在此连接过的设备将显示在下方快捷列表中</div>
        </div>

        <div
          v-else
          class="recent-list"
        >
          <div
            v-for="(item, index) in recentList"
            :key="index"
            class="recent-item"
            @click="quickSelectDevice(item)"
          >
            <div class="left-col">
              <div class="device-icon"></div>
              <div class="device-info">
                <div class="name">
                  {{ item.remark || '未命名设备' }}
                </div>
                <div class="uuid">
                  {{ formatCode(item.remoteDeskUserUuid) }}
                </div>
              </div>
            </div>

            <div class="right-col">
              <button
                class="btn-fast-connect"
                title="立即连接"
                @click.stop="quickConnect(item)"
              >
                连接
              </button>
              <div
                class="btn-delete"
                title="删除记录"
                @click.stop="deleteRecent(item)"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 独立密码弹窗（当未填写密码且无缓存时触发） -->
    <PwdModalCpt
      v-if="showPwdModalCpt"
      :uuid="cacheStore.remoteDeskUserUuid"
      :pwd="modalPwd"
      :err-msg="errMsg"
      @close="handleCloseModal"
      @confirm="handleConfirm"
    ></PwdModalCpt>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import {
  fetchDeskUserLinkVerify,
  fetchFindReceiverByUuid,
} from '@/api/deskUser';
import { usePiniaCacheStore } from '@/store/cache';
import { desktopOpenRemoteWindow } from '@/utils/desktopBridge';
import PwdModalCpt from '@/views/remote/pwdModal.vue';

const cacheStore = usePiniaCacheStore();

const inputUuid = ref(cacheStore.remoteDeskUserUuid || '');
const inputPassword = ref('');
const hidePassword = ref(true);
const loading = ref(false);
const showPwdModalCpt = ref(false);
const modalPwd = ref('');
const errMsg = ref('');
const receiverId = ref('');

const recentList = computed(() => {
  return cacheStore.linkDeviceList || [];
});

function formatCode(raw: string) {
  if (!raw) return '';
  if (raw.length === 8) {
    return `${raw.slice(0, 4)} ${raw.slice(4)}`;
  }
  return raw.replace(/(\d{3})(?=\d)/g, '$1 ');
}

// 自动匹配已保存设备的密码
function handleUuidInput() {
  const clean = inputUuid.value.replace(/\s+/g, '');
  const match = cacheStore.linkDeviceList.find(
    (v) => v.remoteDeskUserUuid === clean
  );
  if (match && match.remoteDeskUserPassword) {
    inputPassword.value = match.remoteDeskUserPassword;
  }
}

function handleEnterKey() {
  if (!inputUuid.value.trim().length) return;
  startRemote();
}

function quickSelectDevice(item: {
  remoteDeskUserUuid: string;
  remoteDeskUserPassword?: string;
}) {
  inputUuid.value = item.remoteDeskUserUuid;
  inputPassword.value = item.remoteDeskUserPassword || '';
}

function quickConnect(item: {
  remoteDeskUserUuid: string;
  remoteDeskUserPassword?: string;
}) {
  inputUuid.value = item.remoteDeskUserUuid;
  inputPassword.value = item.remoteDeskUserPassword || '';
  startRemote();
}

function deleteRecent(item: { remoteDeskUserUuid: string }) {
  cacheStore.linkDeviceList = cacheStore.linkDeviceList.filter(
    (v) => v.remoteDeskUserUuid !== item.remoteDeskUserUuid
  );
  window.$message?.success?.('已移除该记录');
}

function handleCloseModal() {
  showPwdModalCpt.value = false;
  loading.value = false;
}

function getQualityParams() {
  let maxBitrate = 3000;
  let resolutionRatio = 1080;
  if (cacheStore.quality === 'smooth') {
    maxBitrate = 2000;
    resolutionRatio = 720;
  } else if (cacheStore.quality === 'ultra') {
    maxBitrate = 4000;
    resolutionRatio = 1440;
  }
  return {
    maxBitrate,
    resolutionRatio,
    maxFramerate: cacheStore.framerate || 30,
    audioContentHint: '',
    videoContentHint: 'detail',
  };
}

async function startRemote() {
  const cleanUuid = inputUuid.value.replace(/\s+/g, '').trim();
  if (!cleanUuid) {
    window.$message?.warning?.('请输入远程设备代码！');
    return;
  }
  if (cleanUuid === cacheStore.deskUserUuid) {
    window.$message?.warning?.('不能连接本机设备代码！');
    return;
  }

  cacheStore.remoteDeskUserUuid = cleanUuid;

  try {
    loading.value = true;
    const res = await fetchFindReceiverByUuid(cleanUuid);
    if (res.code === 200) {
      if (res.data.receiver) {
        receiverId.value = res.data.receiver;
        // 如果输入框有填密码，直接用输入框密码进行验证
        if (inputPassword.value.trim()) {
          await handleConfirm(inputPassword.value.trim());
        } else {
          // 查看历史中是否有密码
          const old = cacheStore.linkDeviceList.find(
            (v) => v.remoteDeskUserUuid === cleanUuid
          );
          if (old && old.remoteDeskUserPassword) {
            await handleConfirm(old.remoteDeskUserPassword);
          } else {
            loading.value = false;
            modalPwd.value = '';
            showPwdModalCpt.value = true;
          }
        }
      } else {
        window.$message?.info?.('该设备当前不在线');
        loading.value = false;
      }
    } else {
      loading.value = false;
      window.$message?.error?.(res.message || '查询设备状态失败');
    }
  } catch (error) {
    loading.value = false;
    console.log(error);
  }
}

async function handleConfirm(pwd: string) {
  errMsg.value = '';
  try {
    const cleanUuid = cacheStore.remoteDeskUserUuid;
    const res = await fetchDeskUserLinkVerify({
      uuid: cleanUuid,
      password: pwd,
    });

    if (res.code === 200) {
      if (res.data.code === 1) {
        showPwdModalCpt.value = false;

        // 保存/更新到 linkDeviceList，保留原本备注
        const existing = cacheStore.linkDeviceList.find(
          (v) => v.remoteDeskUserUuid === cleanUuid
        );
        const remark = existing?.remark || '';
        cacheStore.linkDeviceList = cacheStore.linkDeviceList.filter(
          (v) => v.remoteDeskUserUuid !== cleanUuid
        );
        cacheStore.linkDeviceList.unshift({
          remoteDeskUserUuid: cleanUuid,
          remoteDeskUserPassword: pwd,
          remark,
          updatedAt: Date.now(),
        });

        const q = getQualityParams();

        setTimeout(() => {
          loading.value = false;
        }, 300);

        await desktopOpenRemoteWindow({
          roomId: cleanUuid,
          deskUserUuid: cacheStore.deskUserUuid,
          deskUserPassword: cacheStore.deskUserPassword,
          remoteDeskUserUuid: cleanUuid,
          remoteDeskUserPassword: pwd,
          receiverId: receiverId.value,
          maxBitrate: q.maxBitrate,
          maxFramerate: q.maxFramerate,
          resolutionRatio: q.resolutionRatio,
          audioContentHint: q.audioContentHint,
          videoContentHint: q.videoContentHint,
        });
      } else {
        loading.value = false;
        showPwdModalCpt.value = true;
        errMsg.value = '连接密码错误，请重新输入';
      }
    } else {
      loading.value = false;
      window.$message?.error?.(res.message || '密码验证失败');
    }
  } catch (error) {
    loading.value = false;
    console.log(error);
  }
}

// 同步初始密码
watch(
  () => inputUuid.value,
  () => {
    handleUuidInput();
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped>
.controller-wrap {
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
    max-width: 560px;
    margin: 0 auto;
    padding: 24px 32px 32px;
  }

  .card {
    background-color: $cursor-surface-card;
    border: 1px solid $cursor-hairline;
    border-radius: $cursor-radius-lg;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
  }

  .connect-card {
    padding: 24px 28px;

    .card-title {
      font-size: 17px;
      font-weight: 600;
      color: $cursor-ink;
      margin-bottom: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 14px;

      .input-item {
        position: relative;
        width: 100%;

        .text-input {
          box-sizing: border-box;
          width: 100%;
          height: 44px;
          padding: 0 16px;
          border-radius: $cursor-radius-md;
          border: 1px solid $cursor-hairline;
          background-color: $cursor-canvas-soft;
          font-size: 15px;
          color: $cursor-ink;
          outline: none;
          transition: all 0.2s ease;

          &::placeholder {
            color: $cursor-muted-soft;
            font-size: 14px;
          }

          &:focus {
            border-color: $cursor-primary;
            background-color: $cursor-surface-card;
            box-shadow: 0 0 0 2px rgba(245, 78, 0, 0.12);
          }

          &.code-input {
            font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
            font-size: 17px;
            letter-spacing: 1px;
            font-weight: 600;
          }
        }

        &.pwd-input-item {
          .text-input {
            padding-right: 44px;
          }

          .btn-icon.eye {
            position: absolute;
            top: 50%;
            right: 14px;
            transform: translateY(-50%);
            width: 20px;
            height: 20px;
            cursor: pointer;
            opacity: 0.6;
            transition: opacity 0.2s;

            &:hover {
              opacity: 1;
            }

            @include setBackground('@/assets/img/view.png');
            &.hide {
              @include setBackground('@/assets/img/view_off.png');
            }
          }
        }
      }

      .btn-connect {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 44px;
        margin-top: 4px;
        background-color: $cursor-primary;
        color: $cursor-on-primary;
        font-size: 15px;
        font-weight: 500;
        border: none;
        border-radius: $cursor-radius-md;
        cursor: pointer;
        transition: background-color 0.2s ease;

        &:hover:not(.disabled) {
          background-color: $cursor-primary-active;
        }

        &.disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .loading-spin {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          animation: spin 0.8s infinite linear;
        }
      }
    }
  }

  .recent-section {
    margin-top: 28px;

    .section-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 12px;
      padding: 0 4px;

      .title {
        font-size: 15px;
        font-weight: 600;
        color: $cursor-ink;
      }

      .count {
        font-size: 12px;
        color: $cursor-muted;
      }
    }

    .empty-card {
      padding: 32px 20px;
      text-align: center;

      .empty-text {
        font-size: 14px;
        color: $cursor-muted;
        font-weight: 500;
      }

      .empty-sub {
        font-size: 12px;
        color: $cursor-muted-soft;
        margin-top: 6px;
      }
    }

    .recent-list {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .recent-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background-color: $cursor-surface-card;
        border: 1px solid $cursor-hairline;
        border-radius: $cursor-radius-md;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          border-color: $cursor-hairline-strong;
          background-color: $cursor-canvas-soft;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
        }

        .left-col {
          display: flex;
          align-items: center;
          gap: 12px;

          .device-icon {
            width: 32px;
            height: 32px;
            border-radius: $cursor-radius-sm;
            background-color: $cursor-canvas-soft;
            border: 1px solid $cursor-hairline;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;

            &::after {
              content: '';
              width: 14px;
              height: 10px;
              border: 1.5px solid $cursor-muted;
              border-radius: 2px;
            }
          }

          .device-info {
            .name {
              font-size: 14px;
              font-weight: 500;
              color: $cursor-ink;
            }

            .uuid {
              font-family: 'JetBrains Mono', monospace;
              font-size: 12px;
              color: $cursor-muted;
              margin-top: 2px;
            }
          }
        }

        .right-col {
          display: flex;
          align-items: center;
          gap: 12px;

          .btn-fast-connect {
            padding: 4px 14px;
            background-color: transparent;
            color: $cursor-primary;
            border: 1px solid rgba(245, 78, 0, 0.3);
            border-radius: $cursor-radius-sm;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;

            &:hover {
              background-color: $cursor-primary;
              color: #fff;
              border-color: $cursor-primary;
            }
          }

          .btn-delete {
            width: 14px;
            height: 14px;
            cursor: pointer;
            opacity: 0.4;
            transition: opacity 0.2s;

            @include cross($cursor-muted, 1px);

            &:hover {
              opacity: 1;
            }
          }
        }
      }
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
