import { defineStore } from 'pinia';

import { LS_KEY_PREFIX } from '@/constant';

export interface ILinkDevice {
  remoteDeskUserUuid: string;
  remoteDeskUserPassword?: string;
  remark?: string;
  updatedAt?: number;
  os?: string;
}

export type PiniaCacheRootState = {
  muted: boolean;
  volume: number;
  linkDeviceList: ILinkDevice[];
  isAlwaysOnTop: boolean;
  hidePwd: boolean;
  deskUserUuid: string;
  deskUserPassword: string;
  remoteDeskUserUuid: string;
  remoteDeskUserPassword: string;
  allowControl: boolean;
  quality: 'smooth' | 'hd' | 'ultra';
  framerate: 30 | 60;
  autoStart: boolean;
};

export const usePiniaCacheStore = defineStore(`${LS_KEY_PREFIX}pinia-cache`, {
  persist: {
    key: `${LS_KEY_PREFIX}pinia-cache`,
  },
  state: (): PiniaCacheRootState => {
    return {
      muted: true,
      volume: 70,
      linkDeviceList: [],
      isAlwaysOnTop: false,
      hidePwd: false,
      deskUserUuid: '',
      deskUserPassword: '',
      remoteDeskUserUuid: '',
      remoteDeskUserPassword: '',
      allowControl: true,
      quality: 'hd',
      framerate: 30,
      autoStart: false,
    };
  },
  actions: {},
});
