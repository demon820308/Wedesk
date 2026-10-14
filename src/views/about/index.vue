<template>
  <div class="about-wrap">
    <div class="item logo"></div>
    <div class="item name">{{ PRODUCT_NAME }}</div>
    <div class="item version">v{{ appStore.version }}</div>
    <div class="copyright">
      Copyright © 2023-2024
      <span
        class="link"
        @click="handleClick()"
        >demon820308</span
      >. All rights reserved.
    </div>
  </div>
</template>

<script lang="ts" setup>
import { AUTHOR_INFO, PRODUCT_NAME, WINDOW_ID_ENUM } from '@/constant';
import { useIpcRendererSend } from '@/hooks/use-ipcRendererSend';
import { useAppStore } from '@/store/app';

const { handleOpenExternal } = useIpcRendererSend();
const appStore = useAppStore();

function handleClick() {
  handleOpenExternal({
    windowId: WINDOW_ID_ENUM.about,
    url: AUTHOR_INFO.github,
  });
}
</script>

<style lang="scss" scoped>
.about-wrap {
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  width: 100vw;
  height: 100vh;
  background-color: $cursor-canvas;
  color: $cursor-body;
  font-size: 15px;
  .item {
    margin: 0 auto;
    text-align: center;
  }
  .logo {
    margin-top: 50px;
    width: 90px;
    height: 90px;
    border-radius: $cursor-radius-lg;
    border: 1px solid $cursor-hairline;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);

    @include setBackground('@/assets/img/logo.png');
  }
  .name {
    padding-top: 16px;
    font-size: 18px;
    font-weight: 600;
    color: $cursor-ink;
  }
  .version {
    padding-top: 10px;
    padding-bottom: 20px;
    font-size: 13px;
    color: $cursor-muted;
    font-family: 'JetBrains Mono', monospace;
  }
  .copyright {
    position: absolute;
    bottom: 30px;
    left: 50%;
    width: 100vw;
    color: $cursor-muted;
    text-align: center;
    font-size: 13px;
    transform: translate(-50%, 0%);
  }

  .link {
    color: $cursor-primary;
    font-weight: 500;
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
