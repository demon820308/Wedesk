export * from '@/pure-constant';
export enum Key {
  Escape = 0,
  F1 = 1,
  F2 = 2,
  F3 = 3,
  F4 = 4,
  F5 = 5,
  F6 = 6,
  F7 = 7,
  F8 = 8,
  F9 = 9,
  F10 = 10,
  F11 = 11,
  F12 = 12,
  F13 = 13,
  F14 = 14,
  F15 = 15,
  F16 = 16,
  F17 = 17,
  F18 = 18,
  F19 = 19,
  F20 = 20,
  F21 = 21,
  F22 = 22,
  F23 = 23,
  F24 = 24,
  Print = 25,
  ScrollLock = 26,
  Pause = 27,
  Grave = 28,
  Num1 = 29,
  Num2 = 30,
  Num3 = 31,
  Num4 = 32,
  Num5 = 33,
  Num6 = 34,
  Num7 = 35,
  Num8 = 36,
  Num9 = 37,
  Num0 = 38,
  Minus = 39,
  Equal = 40,
  Backspace = 41,
  Insert = 42,
  Home = 43,
  PageUp = 44,
  NumLock = 45,
  NumPadEqual = 46,
  Divide = 47,
  Multiply = 48,
  Subtract = 49,
  Tab = 50,
  Q = 51,
  W = 52,
  E = 53,
  R = 54,
  T = 55,
  Y = 56,
  U = 57,
  I = 58,
  O = 59,
  P = 60,
  LeftBracket = 61,
  RightBracket = 62,
  Backslash = 63,
  Delete = 64,
  End = 65,
  PageDown = 66,
  NumPad7 = 67,
  NumPad8 = 68,
  NumPad9 = 69,
  Add = 70,
  CapsLock = 71,
  A = 72,
  S = 73,
  D = 74,
  F = 75,
  G = 76,
  H = 77,
  J = 78,
  K = 79,
  L = 80,
  Semicolon = 81,
  Quote = 82,
  Return = 83,
  NumPad4 = 84,
  NumPad5 = 85,
  NumPad6 = 86,
  LeftShift = 87,
  Z = 88,
  X = 89,
  C = 90,
  V = 91,
  B = 92,
  N = 93,
  M = 94,
  Comma = 95,
  Period = 96,
  Slash = 97,
  RightShift = 98,
  Up = 99,
  NumPad1 = 100,
  NumPad2 = 101,
  NumPad3 = 102,
  Enter = 103,
  LeftControl = 104,
  LeftSuper = 105,
  LeftWin = 106,
  LeftCmd = 107,
  LeftAlt = 108,
  LeftMeta = 109,
  RightControl = 110,
  RightSuper = 111,
  RightWin = 112,
  RightAlt = 113,
  RightCmd = 114,
  RightMeta = 115,
  Space = 116,
  Menu = 117,
  Fn = 118,
  Left = 119,
  Down = 120,
  Right = 121,
  NumPad0 = 122,
  Decimal = 123,
  Clear = 124,
  AudioMute = 125,
  AudioVolDown = 126,
  AudioVolUp = 127,
  AudioPlay = 128,
  AudioStop = 129,
  AudioPause = 130,
  AudioPrev = 131,
  AudioNext = 132,
  AudioRewind = 133,
  AudioForward = 134,
  AudioRepeat = 135,
  AudioRandom = 136,
}

import type { BilldHtmlWebpackPluginLog } from '@/interface';
import { prodDomain } from '@/spec-config';

export const PROJECT_GITHUB = `https://github.com/demon820308/Wedesk`;
export const WEB_DESK_URL = `https://github.com/demon820308/Wedesk`;

export const AUTHOR_INFO = {
  github: 'https://github.com/demon820308',
  wechat: 'zw_bigi',
  qq: '51820645',
};

export const COMMON_URL = {
  privatizationDeployment: 'https://github.com/demon820308/Wedesk',
  payCoursesArticle: `https://github.com/demon820308/Wedesk`,
};

export const PROJECT_NAME = 'wedesk';

// @ts-ignore
export const APP_BUILD_INFO = process.env
  .BilldHtmlWebpackPlugin as BilldHtmlWebpackPluginLog;

export const NODE_ENV = process.env.NODE_ENV;

export const COTURN_URL = `turn:hk.${prodDomain}`;

// ======本地调试=====

// const LOCALHOST_IP = '192.168.1.101:4300';

// export const WEBSOCKET_URL =
//   process.env.NODE_ENV === 'development'
//     ? `ws://localhost:4300`
//     : `ws://${LOCALHOST_IP}`;

// export const AXIOS_BASEURL =
//   process.env.NODE_ENV === 'development' ? `/api` : `http://${LOCALHOST_IP}`;

// ======本地调试=====

// ======线上正式=====

export const WEBSOCKET_URL = `wss://wedesk.${prodDomain}`;

export const AXIOS_BASEURL =
  process.env.NODE_ENV === 'development'
    ? `/api`
    : `https://wedesk.${prodDomain}`;

// ======线上正式=====

export const COOKIE_DOMAIN =
  process.env.NODE_ENV === 'development' ? undefined : `.${prodDomain}`;

export const THEME_COLOR = '#f54e00';

export const PRODUCT_NAME = 'Wedesk';

export const NUT_KEY_MAP = {
  A: Key.A,
  B: Key.B,
  C: Key.C,
  D: Key.D,
  E: Key.E,
  F: Key.F,
  G: Key.G,
  H: Key.H,
  I: Key.I,
  J: Key.J,
  K: Key.K,
  L: Key.L,
  M: Key.M,
  N: Key.N,
  O: Key.O,
  P: Key.P,
  Q: Key.Q,
  R: Key.R,
  S: Key.S,
  T: Key.T,
  U: Key.U,
  V: Key.V,
  W: Key.W,
  X: Key.X,
  Y: Key.Y,
  Z: Key.Z,
  0: Key.Num0,
  1: Key.Num1,
  2: Key.Num2,
  3: Key.Num3,
  4: Key.Num4,
  5: Key.Num5,
  6: Key.Num6,
  7: Key.Num7,
  8: Key.Num8,
  9: Key.Num9,
  Fn: Key.Fn,
  F1: Key.F1,
  F2: Key.F2,
  F3: Key.F3,
  F4: Key.F4,
  F5: Key.F5,
  F6: Key.F6,
  F7: Key.F7,
  F8: Key.F8,
  F9: Key.F9,
  F10: Key.F10,
  F11: Key.F11,
  F12: Key.F12,
  F13: Key.F13,
  F14: Key.F14,
  F15: Key.F15,
  F16: Key.F16,
  F17: Key.F17,
  F18: Key.F18,
  F19: Key.F19,
  F20: Key.F20,
  F21: Key.F21,
  F22: Key.F22,
  F23: Key.F23,
  F24: Key.F24,
  Delete: Key.Delete,
  Enter: Key.Enter,
  Space: Key.Space,
  Backspace: Key.Backspace,
  ShiftLeft: Key.LeftShift,
  ShiftRight: Key.RightShift,
  AltLeft: Key.LeftAlt,
  AltRight: Key.RightAlt,
  Tab: Key.Tab,
  Backquote: Key.Quote,
  Backslash: Key.Backslash,
  ArrowUp: Key.Up,
  ArrowDown: Key.Down,
  ArrowLeft: Key.Left,
  ArrowRight: Key.Right,
  CapsLock: Key.CapsLock,
  ControlLeft: Key.LeftControl,
  ControlRight: Key.RightControl,
  MetaLeft: Key.LeftCmd,
  LeftCmd: Key.LeftCmd,
  MetaRight: Key.RightCmd,
  RightCmd: Key.RightCmd,
  LeftWin: Key.LeftWin,
  RightWin: Key.RightWin,
};

export const SRS_CB_URL_PARAMS = {
  publishKey: 'pushkey',
  publishType: 'pushtype',
  userToken: 'usertoken',
  userId: 'userid',
  randomId: 'randomid',
};

// 全局的cookie的key
export const COOKIE_KEY = {
  thirdLoginInfo: 'thirdLoginInfo',
};

export const LS_KEY_PREFIX = 'billd_desk___';

// 全局的localStorage的key
export const LS_KEY = {
  lastBuildDate: 'lastBuildDate',
  uuid: 'uuid',
  password: 'password',
  token: 'token',
  axiosBaseUrl: 'axiosBaseUrl',
  wssUrl: 'wssUrl',
  coturnUrl: 'coturnUrl',
};
