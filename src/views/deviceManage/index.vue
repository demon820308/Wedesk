<template>
  <div class="device-wrap">
    <div class="nav-space"></div>
    <div class="container">
      <!-- 顶栏操作区 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <div class="page-title">设备簿</div>
          <span class="device-count"
            >共 {{ filteredDevices.length }} 台设备</span
          >
        </div>
        <div class="toolbar-right">
          <button
            class="btn-refresh"
            :class="{ spinning: isRefreshing }"
            :disabled="isRefreshing"
            title="点击刷新设备在线状态"
            @click="refreshDeviceStatus(true)"
          >
            <svg
              class="refresh-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path
                d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
              ></path>
            </svg>
            <span>{{ isRefreshing ? '检测中...' : '刷新状态' }}</span>
          </button>
          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索设备备注或代码..."
              class="search-input"
            />
          </div>
          <button
            class="btn-add"
            @click="openAddModal"
          >
            + 添加设备
          </button>
        </div>
      </div>

      <!-- 设备列表卡片 -->
      <div
        v-if="!filteredDevices.length"
        class="empty-state"
      >
        <div class="empty-icon"></div>
        <div class="empty-title">
          {{ searchQuery ? '未找到匹配的设备' : '设备簿空空如也' }}
        </div>
        <div class="empty-desc">
          {{
            searchQuery
              ? '请尝试其他关键词'
              : '添加常用设备并设置备注（如“家里台式机”），即可一键发起远程控制'
          }}
        </div>
        <button
          v-if="!searchQuery"
          class="btn-add-empty"
          @click="openAddModal"
        >
          添加第一台设备
        </button>
      </div>

      <div
        v-else
        class="device-grid"
      >
        <div
          v-for="(item, index) in filteredDevices"
          :key="index"
          class="device-card"
        >
          <div class="card-main">
            <div class="os-icon">
              <div class="win-logo"></div>
            </div>
            <div class="device-meta">
              <div class="name-row">
                <span class="remark-name">{{
                  item.remark || '未命名设备'
                }}</span>
                <span
                  v-if="onlineStatusMap[item.remoteDeskUserUuid] === true"
                  class="status-tag online"
                >
                  ● 在线
                </span>
                <span
                  v-else-if="onlineStatusMap[item.remoteDeskUserUuid] === false"
                  class="status-tag offline"
                >
                  ○ 离线
                </span>
                <span
                  v-else
                  class="status-tag"
                >
                  已保存
                </span>
              </div>
              <div class="code-row">
                <span class="uuid-text">{{
                  formatCode(item.remoteDeskUserUuid)
                }}</span>
                <span
                  v-if="item.remoteDeskUserPassword"
                  class="pwd-badge"
                  title="已记住连接密码"
                >
                  已存密码
                </span>
              </div>
            </div>
          </div>

          <div class="card-actions">
            <button
              class="btn-action connect"
              :class="{ loading: connectingUuid === item.remoteDeskUserUuid }"
              :disabled="connectingUuid === item.remoteDeskUserUuid"
              @click="handleDirectConnect(item)"
            >
              <span v-if="connectingUuid !== item.remoteDeskUserUuid"
                >远程</span
              >
              <span
                v-else
                class="spin-icon"
              ></span>
            </button>
            <button
              class="btn-action edit"
              @click="openEditModal(item)"
            >
              编辑
            </button>
            <button
              class="btn-action delete"
              @click="handleDelete(item)"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加设备弹窗 -->
    <n-modal
      v-model:show="showAddModal"
      preset="card"
      title="添加设备到设备簿"
      style="width: 440px"
    >
      <div class="modal-form">
        <div class="form-item">
          <label class="item-label">设备代码（必填）</label>
          <input
            v-model="formDevice.uuid"
            type="text"
            class="modal-input code-font"
            placeholder="请输入 8 位远程设备代码"
            maxlength="10"
          />
        </div>
        <div class="form-item">
          <label class="item-label">设备备注（推荐）</label>
          <input
            v-model="formDevice.remark"
            type="text"
            class="modal-input"
            placeholder="例如：办公室电脑、家里台式机"
            maxlength="20"
          />
        </div>
        <div class="form-item">
          <label class="item-label">连接密码（选填，保存后支持免密直连）</label>
          <input
            v-model="formDevice.password"
            type="text"
            class="modal-input"
            placeholder="请输入该设备临时密码"
            maxlength="20"
          />
        </div>
      </div>
      <template #footer>
        <div class="modal-footer">
          <button
            class="btn-modal cancel"
            @click="showAddModal = false"
          >
            取消
          </button>
          <button
            class="btn-modal confirm"
            @click="saveNewDevice"
          >
            保存设备
          </button>
        </div>
      </template>
    </n-modal>

    <!-- 编辑备注弹窗 -->
    <n-modal
      v-model:show="showEditModal"
      preset="card"
      title="编辑设备备注"
      style="width: 400px"
    >
      <div class="modal-form">
        <div class="form-item">
          <label class="item-label">设备代码</label>
          <div class="code-static">{{ formatCode(editTarget.uuid) }}</div>
        </div>
        <div class="form-item">
          <label class="item-label">设备备注</label>
          <input
            v-model="editTarget.remark"
            type="text"
            class="modal-input"
            placeholder="例如：办公室电脑、家里台式机"
            maxlength="20"
            autofocus
            @keydown.enter="saveEditRemark"
          />
        </div>
        <div class="form-item">
          <label class="item-label">连接密码（选填）</label>
          <input
            v-model="editTarget.password"
            type="text"
            class="modal-input"
            placeholder="修改已保存的连接密码"
            maxlength="20"
          />
        </div>
      </div>
      <template #footer>
        <div class="modal-footer">
          <button
            class="btn-modal cancel"
            @click="showEditModal = false"
          >
            取消
          </button>
          <button
            class="btn-modal confirm"
            @click="saveEditRemark"
          >
            保存修改
          </button>
        </div>
      </template>
    </n-modal>

    <!-- 密码输入弹窗（免密失败或未存密码时触发） -->
    <PwdModalCpt
      v-if="showPwdModal"
      :uuid="targetUuid"
      :pwd="modalPwd"
      :err-msg="errMsg"
      @close="showPwdModal = false"
      @confirm="onModalConfirm"
    ></PwdModalCpt>
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import {
  fetchDeskUserLinkVerify,
  fetchFindReceiverByUuid,
} from '@/api/deskUser';
import type { ILinkDevice } from '@/store/cache';
import { usePiniaCacheStore } from '@/store/cache';
import { desktopOpenRemoteWindow } from '@/utils/desktopBridge';
import PwdModalCpt from '@/views/remote/pwdModal.vue';

const cacheStore = usePiniaCacheStore();

const searchQuery = ref('');
const showAddModal = ref(false);
const showEditModal = ref(false);
const connectingUuid = ref('');
const isRefreshing = ref(false);
const onlineStatusMap = reactive<Record<string, boolean>>({});

onMounted(() => {
  refreshDeviceStatus(false);
});

async function refreshDeviceStatus(showTip = true) {
  if (isRefreshing.value) return;
  if (!cacheStore.linkDeviceList.length) return;
  isRefreshing.value = true;
  try {
    await Promise.allSettled(
      cacheStore.linkDeviceList.map(async (item) => {
        const res = await fetchFindReceiverByUuid(item.remoteDeskUserUuid);
        onlineStatusMap[item.remoteDeskUserUuid] =
          res?.code === 200 && Boolean(res?.data?.receiver);
      })
    );
    if (showTip) {
      window.$message?.success?.('设备在线状态已更新');
    }
  } catch (error) {
    console.error(error);
  } finally {
    isRefreshing.value = false;
  }
}

const formDevice = reactive({
  uuid: '',
  remark: '',
  password: '',
});

const editTarget = reactive({
  uuid: '',
  remark: '',
  password: '',
});

const showPwdModal = ref(false);
const targetUuid = ref('');
const modalPwd = ref('');
const errMsg = ref('');
const receiverId = ref('');

const filteredDevices = computed(() => {
  const list = cacheStore.linkDeviceList || [];
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return list;
  return list.filter((item) => {
    const remark = (item.remark || '').toLowerCase();
    const uuid = item.remoteDeskUserUuid.toLowerCase();
    return remark.includes(q) || uuid.includes(q);
  });
});

function formatCode(raw: string) {
  if (!raw) return '';
  if (raw.length === 8) {
    return `${raw.slice(0, 4)} ${raw.slice(4)}`;
  }
  return raw.replace(/(\d{3})(?=\d)/g, '$1 ');
}

function openAddModal() {
  formDevice.uuid = '';
  formDevice.remark = '';
  formDevice.password = '';
  showAddModal.value = true;
}

function saveNewDevice() {
  const cleanUuid = formDevice.uuid.replace(/\s+/g, '').trim();
  if (!cleanUuid) {
    window.$message?.warning?.('请输入远程设备代码！');
    return;
  }
  if (cleanUuid === cacheStore.deskUserUuid) {
    window.$message?.warning?.('不能添加本机设备代码！');
    return;
  }

  // Check duplicate
  const exists = cacheStore.linkDeviceList.find(
    (v) => v.remoteDeskUserUuid === cleanUuid
  );
  if (exists) {
    exists.remark = formDevice.remark.trim() || exists.remark;
    if (formDevice.password) {
      exists.remoteDeskUserPassword = formDevice.password.trim();
    }
    exists.updatedAt = Date.now();
    window.$message?.success?.('设备已更新！');
  } else {
    cacheStore.linkDeviceList.unshift({
      remoteDeskUserUuid: cleanUuid,
      remoteDeskUserPassword: formDevice.password.trim(),
      remark: formDevice.remark.trim(),
      updatedAt: Date.now(),
    });
    window.$message?.success?.('设备已添加到设备簿！');
  }
  showAddModal.value = false;
}

function openEditModal(item: ILinkDevice) {
  editTarget.uuid = item.remoteDeskUserUuid;
  editTarget.remark = item.remark || '';
  editTarget.password = item.remoteDeskUserPassword || '';
  showEditModal.value = true;
}

function saveEditRemark() {
  const target = cacheStore.linkDeviceList.find(
    (v) => v.remoteDeskUserUuid === editTarget.uuid
  );
  if (target) {
    target.remark = editTarget.remark.trim();
    if (editTarget.password) {
      target.remoteDeskUserPassword = editTarget.password.trim();
    }
    window.$message?.success?.('修改已保存');
  }
  showEditModal.value = false;
}

function handleDelete(item: ILinkDevice) {
  cacheStore.linkDeviceList = cacheStore.linkDeviceList.filter(
    (v) => v.remoteDeskUserUuid !== item.remoteDeskUserUuid
  );
  window.$message?.success?.('已从设备簿删除');
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

async function handleDirectConnect(item: ILinkDevice) {
  const cleanUuid = item.remoteDeskUserUuid;
  connectingUuid.value = cleanUuid;
  targetUuid.value = cleanUuid;
  cacheStore.remoteDeskUserUuid = cleanUuid;

  try {
    const res = await fetchFindReceiverByUuid(cleanUuid);
    if (res.code === 200 && res.data.receiver) {
      receiverId.value = res.data.receiver;
      if (item.remoteDeskUserPassword) {
        await executeVerifyAndConnect(item.remoteDeskUserPassword);
      } else {
        connectingUuid.value = '';
        modalPwd.value = '';
        showPwdModal.value = true;
      }
    } else {
      connectingUuid.value = '';
      window.$message?.info?.('该设备当前不在线');
    }
  } catch (error) {
    connectingUuid.value = '';
    console.log(error);
  }
}

async function onModalConfirm(pwd: string) {
  await executeVerifyAndConnect(pwd);
}

async function executeVerifyAndConnect(pwd: string) {
  errMsg.value = '';
  try {
    const cleanUuid = targetUuid.value;
    const res = await fetchDeskUserLinkVerify({
      uuid: cleanUuid,
      password: pwd,
    });

    if (res.code === 200 && res.data.code === 1) {
      showPwdModal.value = false;
      connectingUuid.value = '';

      // Update password & timestamp
      const target = cacheStore.linkDeviceList.find(
        (v) => v.remoteDeskUserUuid === cleanUuid
      );
      if (target) {
        target.remoteDeskUserPassword = pwd;
        target.updatedAt = Date.now();
      }

      const q = getQualityParams();

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
      connectingUuid.value = '';
      showPwdModal.value = true;
      errMsg.value = '连接密码错误，请重新输入';
    }
  } catch (error) {
    connectingUuid.value = '';
    console.log(error);
  }
}
</script>

<style lang="scss" scoped>
.device-wrap {
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
    padding: 24px 32px 32px;
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;

    .toolbar-left {
      display: flex;
      align-items: baseline;
      gap: 10px;

      .page-title {
        font-size: 18px;
        font-weight: 600;
        color: $cursor-ink;
      }

      .device-count {
        font-size: 13px;
        color: $cursor-muted;
      }
    }

    .toolbar-right {
      display: flex;
      align-items: center;
      gap: 12px;

      .btn-refresh {
        display: flex;
        align-items: center;
        gap: 6px;
        height: 36px;
        padding: 0 12px;
        border: 1px solid $cursor-hairline;
        border-radius: $cursor-radius-md;
        background-color: $cursor-surface-card;
        color: $cursor-body;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;

        .refresh-icon {
          width: 14px;
          height: 14px;
          transition: transform 0.5s;
        }

        &:hover:not(:disabled) {
          background-color: $cursor-canvas-soft;
          color: $cursor-ink;
          border-color: $cursor-hairline-strong;
        }

        &.spinning {
          opacity: 0.7;
          cursor: not-allowed;

          .refresh-icon {
            animation: spin 0.8s infinite linear;
          }
        }
      }

      .search-box {
        .search-input {
          box-sizing: border-box;
          width: 200px;
          height: 36px;
          padding: 0 12px;
          border: 1px solid $cursor-hairline;
          border-radius: $cursor-radius-md;
          background-color: $cursor-surface-card;
          font-size: 13px;
          color: $cursor-ink;
          outline: none;
          transition: all 0.2s;

          &::placeholder {
            color: $cursor-muted-soft;
          }

          &:focus {
            border-color: $cursor-primary;
            box-shadow: 0 0 0 2px rgba(245, 78, 0, 0.1);
          }
        }
      }

      .btn-add {
        height: 36px;
        padding: 0 16px;
        background-color: $cursor-primary;
        color: $cursor-on-primary;
        border: none;
        border-radius: $cursor-radius-md;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;

        &:hover {
          background-color: $cursor-primary-active;
        }
      }
    }
  }

  .empty-state {
    padding: 64px 20px;
    text-align: center;
    background-color: $cursor-surface-card;
    border: 1px solid $cursor-hairline;
    border-radius: $cursor-radius-lg;

    .empty-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      opacity: 0.35;
      position: relative;
      border: 2px solid $cursor-muted;
      border-radius: $cursor-radius-md;

      &::after {
        content: '';
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        width: 20px;
        height: 4px;
        background: $cursor-muted;
        border-radius: 2px;
      }
    }

    .empty-title {
      font-size: 15px;
      font-weight: 600;
      color: $cursor-ink;
      margin-bottom: 6px;
    }

    .empty-desc {
      font-size: 13px;
      color: $cursor-muted;
      max-width: 320px;
      margin: 0 auto 18px;
    }

    .btn-add-empty {
      padding: 8px 20px;
      background-color: $cursor-primary;
      color: $cursor-on-primary;
      border: none;
      border-radius: $cursor-radius-md;
      font-size: 13px;
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background-color: $cursor-primary-active;
      }
    }
  }

  .device-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;

    .device-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background-color: $cursor-surface-card;
      border: 1px solid $cursor-hairline;
      border-radius: $cursor-radius-lg;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
      transition: all 0.2s ease;

      &:hover {
        border-color: $cursor-hairline-strong;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
      }

      .card-main {
        display: flex;
        align-items: center;
        gap: 16px;

        .os-icon {
          width: 40px;
          height: 40px;
          border-radius: $cursor-radius-md;
          background-color: $cursor-canvas-soft;
          border: 1px solid $cursor-hairline;
          display: flex;
          align-items: center;
          justify-content: center;

          .win-logo {
            width: 18px;
            height: 18px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2px;

            &::before,
            &::after {
              content: '';
              background-color: #0078d4;
              border-radius: 1px;
            }

            box-shadow: 0 0 0 1px #0078d4;
          }
        }

        .device-meta {
          .name-row {
            display: flex;
            align-items: center;
            gap: 8px;

            .remark-name {
              font-size: 15px;
              font-weight: 600;
              color: $cursor-ink;
            }

            .status-tag {
              font-size: 11px;
              padding: 2px 7px;
              border-radius: 4px;
              background-color: $cursor-canvas-soft;
              color: $cursor-muted;
              border: 1px solid $cursor-hairline;
              transition: all 0.2s;

              &.online {
                background-color: #e8f5e9;
                color: #1f8a65;
                border-color: rgba(31, 138, 101, 0.25);
                font-weight: 500;
              }

              &.offline {
                background-color: $cursor-canvas-soft;
                color: $cursor-muted-soft;
                border-color: $cursor-hairline;
              }
            }
          }

          .code-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 4px;

            .uuid-text {
              font-family: 'JetBrains Mono', monospace;
              font-size: 13px;
              color: $cursor-muted;
              letter-spacing: 0.5px;
            }

            .pwd-badge {
              font-size: 10px;
              color: #1f8a65;
              background-color: #e8f5e9;
              padding: 0 4px;
              border-radius: 3px;
            }
          }
        }
      }

      .card-actions {
        display: flex;
        align-items: center;
        gap: 8px;

        .btn-action {
          padding: 6px 14px;
          border-radius: $cursor-radius-sm;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;

          &.connect {
            background-color: $cursor-primary;
            color: $cursor-on-primary;
            border: none;

            &:hover:not(:disabled) {
              background-color: $cursor-primary-active;
            }

            .spin-icon {
              display: inline-block;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              border: 2px solid rgba(255, 255, 255, 0.4);
              border-top-color: #fff;
              animation: spin 0.8s infinite linear;
            }
          }

          &.edit {
            background-color: transparent;
            color: $cursor-body;
            border: 1px solid $cursor-hairline;

            &:hover {
              background-color: $cursor-canvas-soft;
              color: $cursor-ink;
              border-color: $cursor-hairline-strong;
            }
          }

          &.delete {
            background-color: transparent;
            color: #d04200;
            border: 1px solid rgba(208, 66, 0, 0.2);

            &:hover {
              background-color: #ffe9e5;
            }
          }
        }
      }
    }
  }
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;

  .form-item {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .item-label {
      font-size: 13px;
      font-weight: 500;
      color: $cursor-ink;
    }

    .modal-input {
      box-sizing: border-box;
      width: 100%;
      height: 38px;
      padding: 0 12px;
      border: 1px solid $cursor-hairline;
      border-radius: $cursor-radius-md;
      background-color: $cursor-canvas-soft;
      font-size: 14px;
      color: $cursor-ink;
      outline: none;
      transition: all 0.2s;

      &::placeholder {
        color: $cursor-muted-soft;
        font-size: 13px;
      }

      &:focus {
        border-color: $cursor-primary;
        background-color: $cursor-surface-card;
        box-shadow: 0 0 0 2px rgba(245, 78, 0, 0.1);
      }

      &.code-font {
        font-family: 'JetBrains Mono', monospace;
      }
    }

    .code-static {
      font-family: 'JetBrains Mono', monospace;
      font-size: 16px;
      font-weight: 600;
      color: $cursor-primary;
      padding: 6px 0;
    }
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;

  .btn-modal {
    padding: 6px 16px;
    border-radius: $cursor-radius-sm;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;

    &.cancel {
      background-color: transparent;
      border: 1px solid $cursor-hairline;
      color: $cursor-body;

      &:hover {
        background-color: $cursor-canvas-soft;
      }
    }

    &.confirm {
      background-color: $cursor-primary;
      color: #fff;
      border: none;

      &:hover {
        background-color: $cursor-primary-active;
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
