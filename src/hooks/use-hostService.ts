import { getRandomString, windowReload } from 'billd-utils';
import { computed, ref, watch } from 'vue';

import {
  fetchDeskUserCreate,
  fetchDeskUserLogin,
  fetchDeskUserUpdateByUuid,
} from '@/api/deskUser';
import { WINDOW_ID_ENUM } from '@/constant';
import { IPC_EVENT } from '@/event';
import { useIpcRendererSend } from '@/hooks/use-ipcRendererSend';
import { useRTCParams } from '@/hooks/use-rtcParams';
import { useTip } from '@/hooks/use-tip';
import { useWebsocket } from '@/hooks/use-websocket';
import { useWebRtcRemoteDesk } from '@/hooks/webrtc/remoteDesk';
import { IIpcRendererData } from '@/interface';
import { useAppStore } from '@/store/app';
import { usePiniaCacheStore } from '@/store/cache';
import { useNetworkStore } from '@/store/network';
import {
  WsBilldDeskBehaviorType,
  WsBilldDeskClipboardType,
  WsBilldDeskStartRemote,
  WsBilldDeskStartRemoteResult,
  WsChangeAudioContentHintType,
  WsChangeMaxBitrateType,
  WsChangeMaxFramerateType,
  WsChangeResolutionRatioType,
  WsChangeVideoContentHintType,
  WsConnectStatusEnum,
  WsMsgTypeEnum,
} from '@/types/websocket';
import {
  copyText,
  createNullVideo,
  handlConstraints,
  ipcRenderer,
  ipcRendererInvoke,
  ipcRendererOn,
  ipcRendererSend,
  setAudioTrackContentHints,
  setVideoTrackContentHints,
} from '@/utils';
import { isTauri } from '@/utils/desktopBridge';
import { WebRTCClass } from '@/utils/network/webRTC';

let hasInitialized = false;

// Shared reactive state
const rtc = ref<WebRTCClass>();
const roomId = ref('');
const receiverId = ref('');
const anchorStream = ref<MediaStream>();
const chromeMediaSourceId = ref('');
const originalPassword = ref('');
const loopBilldDeskUpdateUserTimer = ref();
const isServiceReady = ref(false);
const hostLastSyncedText = ref('');
let hasHostClipboardListener = false;
const deletingSet = new Set<string>();

export function useHostService() {
  const appStore = useAppStore();
  const networkStore = useNetworkStore();
  const cacheStore = usePiniaCacheStore();

  const { updateWebRtcRemoteDeskConfig, webRtcRemoteDesk } =
    useWebRtcRemoteDesk();
  const { initWs, connectStatus } = useWebsocket();
  const {
    maxBitrate,
    maxFramerate,
    resolutionRatio,
    audioContentHint,
    videoContentHint,
  } = useRTCParams();
  const { handleScreen, handleRtcBilldDeskBehavior } = useIpcRendererSend();

  const getQualitySettings = () => {
    let bitrateVal = 3000;
    let resVal = 1080;
    if (cacheStore.quality === 'smooth') {
      bitrateVal = 2000;
      resVal = 720;
    } else if (cacheStore.quality === 'ultra') {
      bitrateVal = 4000;
      resVal = 1440;
    }
    return {
      bitrate: bitrateVal,
      resolution: resVal,
      framerate: cacheStore.framerate || 30,
    };
  };

  const currentMaxBitrate = ref<number>(getQualitySettings().bitrate);
  const currentMaxFramerate = ref<number>(getQualitySettings().framerate);
  const currentResolutionRatio = ref<number>(getQualitySettings().resolution);
  const currentVideoContentHint = ref(videoContentHint.value[3].value);
  const currentAudioContentHint = ref(audioContentHint.value[0].value);

  const mySocketId = computed(() => {
    return networkStore.wsMap.get(roomId.value)?.socketIo?.id || '';
  });

  const formattedDeviceUuid = computed(() => {
    const raw = cacheStore.deskUserUuid || '';
    if (!raw) return '--------';
    // Format e.g. 123 456 789 or 1234 5678
    if (raw.length === 8) {
      return `${raw.slice(0, 4)} ${raw.slice(4)}`;
    }
    return raw.replace(/(\d{3})(?=\d)/g, '$1 ');
  });

  function setupWatchers() {
    watch(
      () => [cacheStore.quality, cacheStore.framerate],
      () => {
        const q = getQualitySettings();
        currentMaxBitrate.value = q.bitrate;
        currentMaxFramerate.value = q.framerate;
        currentResolutionRatio.value = q.resolution;
      }
    );

    watch(
      () => networkStore.rtcMap,
      (newval) => {
        newval.forEach((item) => {
          const cleanup = () => {
            handleDel(item.receiver);
          };

          if (item.peerConnection) {
            item.peerConnection.onconnectionstatechange = () => {
              const state = item.peerConnection?.connectionState;
              if (
                state === 'disconnected' ||
                state === 'failed' ||
                state === 'closed'
              ) {
                cleanup();
              }
            };
            item.peerConnection.oniceconnectionstatechange = () => {
              const state = item.peerConnection?.iceConnectionState;
              if (
                state === 'disconnected' ||
                state === 'failed' ||
                state === 'closed'
              ) {
                cleanup();
              }
            };
          }

          const handleChannelMessage = (event: MessageEvent) => {
            try {
              const jsondata: {
                msgType: WsMsgTypeEnum;
                requestId: string;
                data: any;
              } = JSON.parse(event.data);
              const { msgType } = jsondata;
              if (msgType === WsMsgTypeEnum.billdDeskCloseRemote) {
                cleanup();
                return;
              }
              if (msgType === WsMsgTypeEnum.changeMaxBitrate) {
                const { data }: { data: WsChangeMaxBitrateType['data'] } =
                  jsondata;
                currentMaxBitrate.value = data.val;
                rtc.value?.setMaxBitrate(data.val);
              } else if (msgType === WsMsgTypeEnum.changeMaxFramerate) {
                const { data }: { data: WsChangeMaxFramerateType['data'] } =
                  jsondata;
                if (anchorStream.value) {
                  currentMaxFramerate.value = data.val;
                  handlConstraints({
                    frameRate: data.val,
                    height: currentResolutionRatio.value,
                    stream: anchorStream.value,
                  });
                }
              } else if (msgType === WsMsgTypeEnum.changeResolutionRatio) {
                const { data }: { data: WsChangeResolutionRatioType['data'] } =
                  jsondata;
                if (anchorStream.value) {
                  currentResolutionRatio.value = data.val;
                  handlConstraints({
                    frameRate: currentMaxFramerate.value,
                    height: data.val,
                    stream: anchorStream.value,
                  });
                }
              } else if (msgType === WsMsgTypeEnum.changeVideoContentHint) {
                const { data }: { data: WsChangeVideoContentHintType['data'] } =
                  jsondata;
                if (anchorStream.value) {
                  currentVideoContentHint.value = data.val;
                  // @ts-ignore
                  setVideoTrackContentHints(anchorStream.value, data.val);
                }
              } else if (msgType === WsMsgTypeEnum.changeAudioContentHint) {
                const { data }: { data: WsChangeAudioContentHintType['data'] } =
                  jsondata;
                if (anchorStream.value) {
                  currentAudioContentHint.value = data.val;
                  // @ts-ignore
                  setAudioTrackContentHints(anchorStream.value, data.val);
                }
              } else if (msgType === WsMsgTypeEnum.billdDeskBehavior) {
                const { data }: { data: WsBilldDeskBehaviorType['data'] } =
                  jsondata;
                handleRtcBilldDeskBehavior(WINDOW_ID_ENUM.remote, data);
              } else if (msgType === WsMsgTypeEnum.billdDeskClipboard) {
                const { data }: { data: WsBilldDeskClipboardType['data'] } =
                  jsondata;
                if (data?.text && data.text !== hostLastSyncedText.value) {
                  hostLastSyncedText.value = data.text;
                  navigator.clipboard?.writeText?.(data.text).catch(() => {});
                }
              }
            } catch (err) {
              console.error('DataChannel message parse error:', err);
            }
          };

          if (item.dataChannel) {
            item.dataChannel.onclose = cleanup;
            item.dataChannel.onmessage = handleChannelMessage;
          }

          if (item.cbDataChannel) {
            item.cbDataChannel.onclose = cleanup;
            item.cbDataChannel.onmessage = handleChannelMessage;
          }
        });
      },
      { immediate: true, deep: true }
    );

    watch(
      () => anchorStream.value,
      (newval) => {
        if (newval) {
          appStore.remoteDesk.forEach((item) => {
            if (!item.isClose) {
              handleRTC(item.sender);
            }
          });
        }
      }
    );

    watch(
      () => appStore.remoteDesk.size,
      async (newval) => {
        if (window.location.hash.includes('webrtc')) return;
        if (newval) {
          if (!anchorStream.value) {
            await startScreenCapture();
          }
        } else {
          handleCloseAll();
        }
      },
      { immediate: true }
    );

    watch(
      () => connectStatus.value,
      (newval) => {
        if (newval === WsConnectStatusEnum.connect) {
          handleWsMsg();
        }
      }
    );
  }

  let isCapturingScreen = false;
  let nativeCaptureTimer: any = null;
  let nativeCaptureCanvas: HTMLCanvasElement | null = null;
  let isNativeCapturing = false;

  async function startNativeScreenCapture(): Promise<MediaStream | null> {
    const { invoke } = await import('@tauri-apps/api/core');

    if (!nativeCaptureCanvas) {
      nativeCaptureCanvas = document.createElement('canvas');
      nativeCaptureCanvas.width = 1920;
      nativeCaptureCanvas.height = 1080;
    }
    const canvas = nativeCaptureCanvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;

    isNativeCapturing = true;

    let quality = 75;
    if (cacheStore.quality === 'ultra') {
      quality = 85;
    } else if (cacheStore.quality === 'smooth') {
      quality = 60;
    }

    try {
      const initialBuf = await invoke<ArrayBuffer>('capture_screen_frame', {
        quality,
      });
      const blob = new Blob([initialBuf], { type: 'image/jpeg' });
      const bitmap = await createImageBitmap(blob);
      if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
      }
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
    } catch (e) {
      console.error('Initial capture_screen_frame error:', e);
    }

    const fps = currentMaxFramerate.value || 30;
    const stream = canvas.captureStream(fps);

    const intervalMs = Math.floor(1000 / fps);
    let isFrameBusy = false;

    const loop = async () => {
      if (!isNativeCapturing) return;
      if (!isFrameBusy) {
        isFrameBusy = true;
        try {
          const buf = await invoke<ArrayBuffer>('capture_screen_frame', {
            quality,
          });
          const blob = new Blob([buf], { type: 'image/jpeg' });
          const bitmap = await createImageBitmap(blob);
          if (
            canvas.width !== bitmap.width ||
            canvas.height !== bitmap.height
          ) {
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
          }
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
        } catch (err) {
          // ignore individual frame error
        } finally {
          isFrameBusy = false;
        }
      }
      if (isNativeCapturing) {
        nativeCaptureTimer = setTimeout(loop, intervalMs);
      }
    };

    nativeCaptureTimer = setTimeout(loop, intervalMs);
    return stream;
  }

  function stopNativeScreenCapture() {
    isNativeCapturing = false;
    if (nativeCaptureTimer) {
      clearTimeout(nativeCaptureTimer);
      nativeCaptureTimer = null;
    }
  }

  async function startScreenCapture() {
    if (anchorStream.value || isCapturingScreen) return;
    if (
      window.location.hash.includes('webrtc') ||
      window.location.hash.includes('remote')
    ) {
      return;
    }
    if (ipcRenderer) {
      handleScreen({ windowId: WINDOW_ID_ENUM.remote });
      return;
    }
    if (isTauri()) {
      isCapturingScreen = true;
      try {
        const stream = await startNativeScreenCapture();
        if (stream) {
          anchorStream.value = stream;
        }
      } catch (error) {
        console.error('startNativeScreenCapture failed:', error);
        window.$message?.error?.('原生屏幕捕获失败');
        handleCloseAll();
      } finally {
        isCapturingScreen = false;
      }
      return;
    }
    // 纯网页环境：仅在处于受控端页面（/#/host）且开启允许被控时才允许触发浏览器屏幕共享
    if (
      !window.location.hash.includes('host') ||
      cacheStore.allowControl === false
    ) {
      return;
    }
    isCapturingScreen = true;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: currentMaxFramerate.value,
        },
        audio: false,
      });
      anchorStream.value = stream;
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          handleCloseAll();
        };
      }
    } catch (error) {
      console.error('getDisplayMedia failed or cancelled:', error);
      window.$message?.error?.('获取屏幕共享权限失败或已取消');
      handleCloseAll();
    } finally {
      isCapturingScreen = false;
    }
  }

  function handleWsMsg() {
    const ws = networkStore.wsMap.get(roomId.value);
    ws?.socketIo?.off?.(WsMsgTypeEnum.billdDeskStartRemoteResult);
    ws?.socketIo?.on(
      WsMsgTypeEnum.billdDeskStartRemoteResult,
      async (data: WsBilldDeskStartRemoteResult['data']) => {
        console.log('收到billdDeskStartRemoteResult', data);
        if (data.code !== 0) {
          useTip({
            content: data.msg,
            hiddenCancel: true,
            hiddenClose: true,
          });
        } else {
          if (data.data) {
            receiverId.value = data.data.receiver;
            if (data.data.receiver === mySocketId.value) {
              // 检查是否允许被控
              if (cacheStore.allowControl === false) {
                window.$notification?.warning?.({
                  title: '连接已拒绝',
                  content: `收到来自设备 ${data.data.deskUserUuid} 的远程请求，但本机已关闭允许控制。`,
                  duration: 4000,
                });
                return;
              }

              appStore.remoteDesk.set(data.data.sender, {
                sender: data.data.sender,
                isClose: false,
                maxBitrate: data.data.maxBitrate,
                maxFramerate: data.data.maxFramerate,
                resolutionRatio: data.data.resolutionRatio,
                videoContentHint: data.data.videoContentHint,
                audioContentHint: data.data.audioContentHint,
                deskUserUuid: data.data.deskUserUuid,
                remoteDeskUserUuid: data.data.remoteDeskUserUuid,
              });
              if (!anchorStream.value) {
                await startScreenCapture();
              }
              handleRTC(data.data.sender);
            }
          }
        }
      }
    );
    ws?.socketIo?.off?.(WsMsgTypeEnum.billdDeskCloseRemote);
    ws?.socketIo?.on(WsMsgTypeEnum.billdDeskCloseRemote, (data: any) => {
      console.log('收到billdDeskCloseRemote', data);
      if (data?.sender) {
        handleDel(data.sender);
      }
    });
  }

  async function handleDesktopStream(sourceId: string) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          // @ts-ignore
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId,
          },
        },
      });
      anchorStream.value = stream;
    } catch (error) {
      console.log(error);
    }
  }

  const startingRtcSet = new Set<string>();

  async function handleRTC(receiver: string) {
    if (!anchorStream.value) return;
    if (networkStore.rtcMap.has(receiver) || startingRtcSet.has(receiver)) {
      return;
    }
    startingRtcSet.add(receiver);
    try {
      await handlConstraints({
        frameRate: currentMaxFramerate.value,
        height: currentResolutionRatio.value,
        stream: anchorStream.value,
      });
      setVideoTrackContentHints(
        anchorStream.value,
        // @ts-ignore
        currentVideoContentHint.value
      );
      setAudioTrackContentHints(
        anchorStream.value,
        // @ts-ignore
        currentAudioContentHint.value
      );
      updateWebRtcRemoteDeskConfig({
        roomId: roomId.value,
        anchorStream: anchorStream.value,
      });
      rtc.value = webRtcRemoteDesk.newWebRtc({
        sender: mySocketId.value,
        receiver,
        videoEl: createNullVideo(),
        deskUserUuid: cacheStore.deskUserUuid,
        remoteDeskUserUuid: cacheStore.remoteDeskUserUuid,
      });
      rtc.value.peerConnection?.addEventListener(
        'connectionstatechange',
        () => {
          const state = rtc.value?.peerConnection?.connectionState;
          if (
            state === 'disconnected' ||
            state === 'failed' ||
            state === 'closed'
          ) {
            handleDel(receiver);
          }
        }
      );
      webRtcRemoteDesk.sendOffer({
        sender: mySocketId.value,
        receiver,
      });
    } catch (error) {
      console.log(error);
    } finally {
      startingRtcSet.delete(receiver);
    }
  }

  function handleLoopBilldDeskUpdateUserTimer() {
    clearInterval(loopBilldDeskUpdateUserTimer.value);
    loopBilldDeskUpdateUserTimer.value = setInterval(() => {
      networkStore.wsMap
        .get(roomId.value)
        ?.send<WsBilldDeskStartRemote['data']>({
          requestId: getRandomString(8),
          msgType: WsMsgTypeEnum.billdDeskUpdateUser,
          data: {
            roomId: roomId.value,
            sender: mySocketId.value,
            receiver: receiverId.value,
            maxBitrate: currentMaxBitrate.value,
            maxFramerate: currentMaxFramerate.value,
            resolutionRatio: currentResolutionRatio.value,
            videoContentHint: currentVideoContentHint.value,
            audioContentHint: currentAudioContentHint.value,
            deskUserUuid: cacheStore.deskUserUuid,
            deskUserPassword: cacheStore.deskUserPassword,
            remoteDeskUserUuid: cacheStore.remoteDeskUserUuid,
            remoteDeskUserPassword: cacheStore.remoteDeskUserPassword,
          },
        });
    }, 1000 * 5);
  }

  async function initDeskUser() {
    try {
      if (!cacheStore.deskUserUuid || !cacheStore.deskUserPassword) {
        const res = await fetchDeskUserCreate();
        if (res.code === 200) {
          cacheStore.deskUserUuid = res.data.uuid!;
          cacheStore.deskUserPassword = res.data.password!;
          originalPassword.value = res.data.password!;
          roomId.value = cacheStore.deskUserUuid;
        }
      } else {
        const res = await fetchDeskUserLogin({
          uuid: cacheStore.deskUserUuid,
          password: cacheStore.deskUserPassword,
        });
        if (res.code === 200) {
          originalPassword.value = cacheStore.deskUserPassword;
          roomId.value = cacheStore.deskUserUuid;
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  function handleInitIpcRendererOn() {
    ipcRendererOn(
      IPC_EVENT.response_getScreenStream,
      (_event, data: IIpcRendererData) => {
        if (data.code !== 0) {
          window.$message?.error?.(data.msg || '获取屏幕流失败');
          return;
        }
        chromeMediaSourceId.value = data.data.stream.id;
        handleDesktopStream(data.data.stream.id);
      }
    );

    ipcRendererOn(
      IPC_EVENT.response_workAreaSize,
      (_event, data: IIpcRendererData) => {
        appStore.workAreaSize = {
          width: data.data.width,
          height: data.data.height,
        };
      }
    );

    ipcRendererOn(IPC_EVENT.response_powerMonitorResume, () => {
      handleCloseAll();
    });
  }

  async function handleInitIpcRendererSend() {
    ipcRendererSend({
      windowId: WINDOW_ID_ENUM.remote,
      channel: IPC_EVENT.workAreaSize,
      requestId: getRandomString(8),
      data: {},
    });

    const res = await ipcRendererInvoke({
      windowId: WINDOW_ID_ENUM.remote,
      channel: IPC_EVENT.getPrimaryDisplaySize,
      requestId: getRandomString(8),
      data: {},
    });
    if (res?.code === 0) {
      appStore.primaryDisplaySize.width = res.data.width;
      appStore.primaryDisplaySize.height = res.data.height;
    }

    const res1 = await ipcRendererInvoke({
      windowId: WINDOW_ID_ENUM.remote,
      channel: IPC_EVENT.scaleFactor,
      requestId: getRandomString(8),
      data: {},
    });
    if (res1?.code === 0 && res1?.data?.platform !== 'darwin') {
      appStore.scaleFactor = res1.data.scaleFactor;
    }
  }

  async function initHost() {
    if (hasInitialized) return;
    hasInitialized = true;
    handleInitIpcRendererOn();
    await handleInitIpcRendererSend();
    await initDeskUser();
    handleLoopBilldDeskUpdateUserTimer();
    initWs({
      roomId: roomId.value,
      deskUserUuid: cacheStore.deskUserUuid,
      deskUserPassword: cacheStore.deskUserPassword,
      isAnchor: false,
      isRemoteDesk: true,
    });
    setupWatchers();
    setupHostClipboardSync();
    isServiceReady.value = true;
  }

  function setupHostClipboardSync() {
    if (hasHostClipboardListener) return;
    hasHostClipboardListener = true;
    window.addEventListener('copy', () => {
      if (!appStore.remoteDesk.size) return;
      setTimeout(async () => {
        try {
          const text = await navigator.clipboard?.readText?.();
          if (text && text !== hostLastSyncedText.value) {
            hostLastSyncedText.value = text;
            appStore.remoteDesk.forEach((_session, sender) => {
              networkStore.rtcMap
                .get(sender)
                ?.dataChannelSend<WsBilldDeskClipboardType['data']>({
                  requestId: getRandomString(8),
                  msgType: WsMsgTypeEnum.billdDeskClipboard,
                  data: { text },
                });
            });
          }
        } catch (e) {
          console.error(e);
        }
      }, 100);
    });
  }

  function handleCloseAll() {
    stopNativeScreenCapture();
    anchorStream.value?.getTracks().forEach((track) => {
      track.stop();
    });
    anchorStream.value = undefined;
    appStore.remoteDesk.forEach((item) => {
      networkStore.removeRtc(item.sender);
    });
    appStore.remoteDesk.clear();
  }

  function handleDel(targetId: string) {
    let realId = targetId;
    if (!appStore.remoteDesk.has(realId)) {
      if (appStore.remoteDesk.size === 1) {
        realId = Array.from(appStore.remoteDesk.keys())[0];
      } else {
        return;
      }
    }

    if (deletingSet.has(realId)) {
      return;
    }
    deletingSet.add(realId);

    try {
      networkStore.rtcMap.get(realId)?.dataChannelSend({
        requestId: getRandomString(8),
        msgType: WsMsgTypeEnum.billdDeskCloseRemote,
        data: {
          roomId: roomId.value,
          sender: mySocketId.value,
          receiver: realId,
        },
      });
      networkStore.wsMap.get(roomId.value)?.send({
        requestId: getRandomString(8),
        msgType: WsMsgTypeEnum.billdDeskCloseRemote,
        data: {
          roomId: roomId.value,
          sender: mySocketId.value,
          receiver: realId,
          remoteDeskUserUuid: cacheStore.deskUserUuid,
        },
      });
    } catch (e) {
      console.error('发送断开信令异常:', e);
    }

    networkStore.removeRtc(realId);
    appStore.remoteDesk.delete(realId);
    if (!appStore.remoteDesk.size) {
      handleCloseAll();
    }
    window.$message?.success?.('已断开该连接');
    setTimeout(() => {
      deletingSet.delete(realId);
    }, 1500);
  }

  async function handleUpdatePassword() {
    try {
      const newPwd = getRandomString(8);
      await fetchDeskUserUpdateByUuid({
        uuid: cacheStore.deskUserUuid!,
        password: originalPassword.value,
        new_password: newPwd,
      });
      cacheStore.deskUserPassword = newPwd;
      originalPassword.value = newPwd;
      window.$message?.success?.('临时密码刷新成功！');
    } catch (error) {
      console.log(error);
      window.$message?.error?.('刷新临时密码失败');
    }
  }

  async function handleResetDeskuuid() {
    cacheStore.deskUserUuid = '';
    cacheStore.deskUserPassword = '';
    await initDeskUser();
    windowReload();
  }

  async function handleCopy(str: string, successMsg = '复制成功！') {
    const ok = await copyText(str);
    if (ok) {
      window.$message?.success?.(successMsg);
    } else {
      window.$message?.error?.('复制失败，请手动选中复制');
    }
  }

  async function handleCopyRemoteInfo() {
    const str = `Wedesk 设备代码: ${cacheStore.deskUserUuid} 临时密码: ${cacheStore.deskUserPassword}`;
    const ok = await copyText(str);
    if (ok) {
      window.$message?.success?.('已复制全部连接信息！');
    } else {
      window.$message?.error?.('复制失败，请手动选中复制');
    }
  }

  return {
    isServiceReady,
    roomId,
    mySocketId,
    formattedDeviceUuid,
    connectStatus,
    initHost,
    handleDel,
    handleCloseAll,
    handleUpdatePassword,
    handleResetDeskuuid,
    handleCopy,
    handleCopyRemoteInfo,
    currentMaxBitrate,
    currentMaxFramerate,
    currentResolutionRatio,
    currentVideoContentHint,
    currentAudioContentHint,
    maxBitrate,
    maxFramerate,
    resolutionRatio,
    videoContentHint,
    audioContentHint,
  };
}
