export interface Env {
  DB: D1Database;
  SIGNALING_HUB: DurableObjectNamespace;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function generateRandomUuid(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

function generateRandomPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 6; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // 2. 处理 WebSocket / Socket.IO 信令请求
    if (
      request.headers.get('Upgrade') === 'websocket' ||
      url.pathname.startsWith('/socket.io')
    ) {
      const id = env.SIGNALING_HUB.idFromName('global-signaling-hub');
      const hub = env.SIGNALING_HUB.get(id);
      return hub.fetch(request);
    }

    // 3. 处理内部 API (查询设备是否在线或连接状态)
    if (url.pathname.startsWith('/internal/')) {
      const id = env.SIGNALING_HUB.idFromName('global-signaling-hub');
      const hub = env.SIGNALING_HUB.get(id);
      return hub.fetch(request);
    }

    // 规范化 API 路径 (去掉 /api 前缀以兼容两种模式)
    const pathname = url.pathname.replace(/^\/api/, '');

    try {
      // 4. API 路由实现
      // 4.1 生成新设备代码与临时密码
      if (pathname === '/desk_user/create' && request.method === 'POST') {
        const uuid = generateRandomUuid();
        const password = generateRandomPassword();

        await env.DB.prepare(
          'INSERT INTO desk_user (uuid, password) VALUES (?, ?)'
        )
          .bind(uuid, password)
          .run();

        return jsonResponse({
          code: 200,
          message: 'ok',
          data: { uuid, password },
        });
      }

      // 4.2 设备登录 / 注册
      if (pathname === '/desk_user/login' && request.method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as any;
        let { uuid, password } = body;

        if (!uuid) {
          uuid = generateRandomUuid();
          password = generateRandomPassword();
          await env.DB.prepare(
            'INSERT INTO desk_user (uuid, password) VALUES (?, ?)'
          )
            .bind(uuid, password)
            .run();
        } else {
          const user = await env.DB.prepare(
            'SELECT * FROM desk_user WHERE uuid = ?'
          )
            .bind(uuid)
            .first();

          if (!user) {
            await env.DB.prepare(
              'INSERT INTO desk_user (uuid, password) VALUES (?, ?)'
            )
              .bind(uuid, password || generateRandomPassword())
              .run();
          }
        }

        return jsonResponse({
          code: 200,
          message: 'ok',
          data: {
            uuid,
            password,
            token: `token_${uuid}`,
          },
        });
      }

      // 4.3 验证连接密码
      if (pathname === '/desk_user/link_verify' && request.method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as any;
        const { uuid, password } = body;

        const user = await env.DB.prepare(
          'SELECT password FROM desk_user WHERE uuid = ?'
        )
          .bind(uuid)
          .first<{ password: string }>();

        if (user && user.password === password) {
          return jsonResponse({
            code: 200,
            message: '验证通过',
            data: { code: 1 },
          });
        }

        return jsonResponse({
          code: 200,
          message: '设备代码或密码错误',
          data: { code: 2 },
        });
      }

      // 4.4 检查目标设备在线状态及 socket_id
      if (
        pathname === '/desk_user/find_receiver_by_uuid' &&
        request.method === 'GET'
      ) {
        const targetUuid = url.searchParams.get('uuid');
        if (!targetUuid) {
          return jsonResponse({ code: 400, message: 'uuid不能为空' });
        }

        // 向 Durable Object 查询该 uuid 是否在线
        const id = env.SIGNALING_HUB.idFromName('global-signaling-hub');
        const hub = env.SIGNALING_HUB.get(id);
        const checkRes = await hub.fetch(
          new Request(
            `http://internal/get_socket_by_uuid?uuid=${encodeURIComponent(targetUuid)}`
          )
        );
        const checkData = (await checkRes.json()) as { socketId: string };

        return jsonResponse({
          code: 200,
          message: 'ok',
          data: { receiver: checkData.socketId || '' },
        });
      }

      // 4.5 修改设备密码
      if (
        pathname === '/desk_user/update_by_uuid' &&
        request.method === 'PUT'
      ) {
        const body = (await request.json().catch(() => ({}))) as any;
        const { uuid, password } = body;

        await env.DB.prepare(
          'UPDATE desk_user SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?'
        )
          .bind(password, uuid)
          .run();

        return jsonResponse({
          code: 200,
          message: '修改成功',
          data: { uuid, password },
        });
      }

      // 4.6 版本检查 API 兼容 (避免前端控制台报 404)
      if (
        pathname === '/desk_version/check' ||
        pathname === '/desk_version/find_by_version' ||
        pathname === '/desk_version/latest'
      ) {
        return jsonResponse({
          code: 200,
          message: 'ok',
          data: null,
        });
      }

      return jsonResponse({ code: 404, message: `Not Found: ${pathname}` }, 404);
    } catch (err: any) {
      return jsonResponse(
        { code: 500, message: err.message || 'Server error' },
        500
      );
    }
  },
};

/**
 * Cloudflare Durable Object:
 * 维护在线 WebSocket 长连接与轻量 Socket.IO 协议适配
 */
export class SignalingHub {
  private sockets = new Map<
    WebSocket,
    { socketId: string; uuid?: string; roomId?: string }
  >();
  private socketIdMap = new Map<string, WebSocket>();
  private uuidMap = new Map<string, WebSocket>();
  private rooms = new Map<string, Set<WebSocket>>();

  constructor() {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // 内部查询接口: 根据 uuid 获取对应在线 socket_id
    if (url.pathname === '/get_socket_by_uuid') {
      const targetUuid = url.searchParams.get('uuid')?.trim();
      const ws = targetUuid ? this.uuidMap.get(targetUuid) : undefined;
      const session = ws ? this.sockets.get(ws) : undefined;
      return new Response(JSON.stringify({ socketId: session?.socketId || '' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/internal/status') {
      const activeUuids: string[] = [];
      for (const [uuid] of this.uuidMap.entries()) {
        activeUuids.push(uuid);
      }
      return new Response(
        JSON.stringify({
          activeConnections: this.sockets.size,
          activeUuids,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 升级 WebSocket
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.handleSession(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: CORS_HEADERS,
    });
  }

  private handleSession(ws: WebSocket) {
    ws.accept();
    const socketId = 'sock_' + Math.random().toString(36).substring(2, 10);
    this.sockets.set(ws, { socketId });
    this.socketIdMap.set(socketId, ws);

    // 1. 发送 Engine.IO v4 握手报文: 0{"sid":...}
    // 将 pingInterval 和 pingTimeout 增大至 10 分钟，依靠客户端的高频业务心跳（billdDeskUpdateUser）保活，彻底杜绝客户端每 45 秒触发 ping timeout 异常断开
    const handshake = `0${JSON.stringify({
      sid: socketId,
      upgrades: [],
      pingInterval: 600000,
      pingTimeout: 600000,
      maxPayload: 1000000,
    })}`;
    ws.send(handshake);

    ws.addEventListener('message', (event) => {
      const raw = typeof event.data === 'string' ? event.data : '';
      if (!raw) return;

      // 心跳 Ping/Pong
      if (raw === '2') {
        ws.send('3'); // 收到客户端 Ping，回复 Pong
        return;
      }
      if (raw === '3') {
        // 收到客户端 Pong
        return;
      }

      // Socket.IO CONNECT
      if (raw.startsWith('40')) {
        ws.send(`40${JSON.stringify({ sid: socketId })}`);
        return;
      }

      // Socket.IO EVENT 消息: 42["event", data] 或带 ack ID 如 420[...]
      const match = raw.match(/^42\d*(.*)$/);
      if (match && match[1]) {
        try {
          const parsed = JSON.parse(match[1]);
          const [event, payload] = parsed;
          this.handleSocketEvent(ws, socketId, event, payload);
        } catch (e) {
          console.error('Parse Socket.IO packet error', e, raw);
        }
      }
    });

    const cleanup = () => {
      const session = this.sockets.get(ws);
      if (session) {
        if (session.uuid && this.uuidMap.get(session.uuid) === ws) {
          this.uuidMap.delete(session.uuid);
        }
        this.socketIdMap.delete(session.socketId);
        if (session.roomId && this.rooms.has(session.roomId)) {
          const room = this.rooms.get(session.roomId);
          room?.delete(ws);
          // 仅当受控宿主端异常退出时，才向房间内广播断开；避免主控端刷新/重连时误踢同房间连接
          if (session.uuid && session.uuid === session.roomId) {
            room?.forEach((client) => {
              this.emitTo(client, 'billdDeskCloseRemote', { sender: session.socketId });
            });
          }
        }
      }
      this.sockets.delete(ws);
    };

    ws.addEventListener('close', cleanup);
    ws.addEventListener('error', cleanup);
  }

  private handleSocketEvent(
    ws: WebSocket,
    socketId: string,
    event: string,
    payload: any
  ) {
    const session = this.sockets.get(ws);
    if (!session) return;

    // 1. 客户端上线加入房间 / 状态心跳上报
    if (event === 'billdDeskJoin' || event === 'billdDeskUpdateUser') {
      const data = payload?.data || {};
      const deskUserUuid = (data.deskUserUuid || '').toString().trim();
      const roomId = (data.live_room_id || data.roomId || deskUserUuid || '').toString().trim();

      // 仅当携带明确的本机设备代码时记录在线表，严禁使用房间号回退，避免主控端加入房间时覆盖受控端
      if (deskUserUuid) {
        session.uuid = deskUserUuid;
        this.uuidMap.set(deskUserUuid, ws);
      }

      if (roomId) {
        session.roomId = roomId;
        if (!this.rooms.has(roomId)) {
          this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId)!.add(ws);
      }

      // 仅 join 时回复 joined
      if (event === 'billdDeskJoin') {
        this.emitTo(ws, 'billdDeskJoined', {
          live_room: { id: roomId },
          anchor_info: {},
          receiver: socketId,
        });
      }
      return;
    }

    // 2. 发起远程连接请求
    if (event === 'billdDeskStartRemote') {
      const data = payload?.data || {};
      const targetUuid = String(data.remoteDeskUserUuid || '').trim();
      const targetWs = targetUuid ? this.uuidMap.get(targetUuid) : undefined;
      const targetSession = targetWs ? this.sockets.get(targetWs) : undefined;

      if (targetWs && targetSession) {
        const resultData = {
          code: 0,
          msg: 'ok',
          data: {
            ...data,
            sender: socketId,
            receiver: targetSession.socketId,
          },
        };
        // 告知主控端
        this.emitTo(ws, 'billdDeskStartRemoteResult', resultData);
        // 告知被控端开始准备 WebRTC 媒体推流
        this.emitTo(targetWs, 'billdDeskStartRemoteResult', resultData);
      } else {
        this.emitTo(ws, 'billdDeskStartRemoteResult', {
          code: 1,
          msg: '目标远程设备不在线或连接不可达',
        });
      }
      return;
    }

    // 3. WebRTC 信令转发: Offer / Answer / Candidate / Behavior
    if (
      event === 'nativeWebRtcOffer' ||
      event === 'nativeWebRtcAnswer' ||
      event === 'nativeWebRtcCandidate' ||
      event === 'billdDeskOffer' ||
      event === 'billdDeskAnswer' ||
      event === 'billdDeskCandidate' ||
      event === 'billdDeskBehavior' ||
      event === 'billdDeskCloseRemote'
    ) {
      const targetSocketId = payload?.data?.receiver;
      let targetWs = targetSocketId
        ? this.socketIdMap.get(targetSocketId)
        : undefined;

      if (!targetWs && payload?.data?.remoteDeskUserUuid) {
        targetWs = this.uuidMap.get(String(payload.data.remoteDeskUserUuid));
      }

      if (targetWs) {
        this.emitTo(targetWs, event, payload.data);
      }
      return;
    }

    // 4. 定时心跳
    if (event === 'heartbeat') {
      this.emitTo(ws, 'heartbeat', payload?.data || {});
      return;
    }
  }

  private emitTo(ws: WebSocket, event: string, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(`42${JSON.stringify([event, data])}`);
    }
  }
}
