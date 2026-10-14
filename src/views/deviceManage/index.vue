<template>
  <div class="setting-wrap">
    <div class="nav"></div>
    <div class="container">
      <div class="label">最近连接</div>
      <div v-if="!cacheStore.linkDeviceList.length">暂无记录</div>
      <div
        v-else
        class="link-device-list"
      >
        <div
          v-for="(item, index) in cacheStore.linkDeviceList"
          :key="index"
          class="link-device-item"
        >
          <div class="left">{{ item.remoteDeskUserUuid }}</div>
          <div class="right">
            <div
              class="del"
              @click="handleDelLinkDeviceList(item)"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { usePiniaCacheStore } from '@/store/cache';

const cacheStore = usePiniaCacheStore();

function handleDelLinkDeviceList(item) {
  cacheStore.linkDeviceList = cacheStore.linkDeviceList.filter(
    (v) => v.remoteDeskUserUuid !== item.remoteDeskUserUuid
  );
}
</script>

<style lang="scss" scoped>
.setting-wrap {
  box-sizing: border-box;
  height: 100vh;
  .nav {
    height: $top-system-bar-height;
  }
  .container {
    overflow: scroll;
    padding: 0 40px;
    height: calc(100vh - $top-system-bar-height);

    @extend %customScrollbarHide;
    &:hover {
      @extend %customScrollbar;
    }

    .label {
      margin-bottom: 14px;
      font-weight: 600;
      font-size: 16px;
      color: $cursor-ink;
    }

    .link-device-list {
      position: relative;
      overflow: scroll;
      box-sizing: border-box;
      max-height: 240px;
      width: 100%;
      border: 1px solid $cursor-hairline;
      border-radius: $cursor-radius-lg;
      background-color: $cursor-surface-card;

      @extend %hideScrollbar;
      .link-device-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-sizing: border-box;
        padding: 0 16px;
        width: 100%;
        height: 44px;
        transition: background-color 0.2s;
        &:hover {
          background-color: $cursor-canvas-soft;
        }
        .left {
          font-size: 14px;
          color: $cursor-ink;
          font-family: 'JetBrains Mono', 'Consolas', monospace;
        }
        .right {
          .del {
            width: 14px;
            height: 14px;
            cursor: pointer;

            @include cross($cursor-muted, 1px);
          }
        }
      }
    }
  }
}
</style>
