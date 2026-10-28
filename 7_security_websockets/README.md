# Bài 7: Bảo mật Ứng dụng và Giao tiếp Thời gian thực

> **Phiên bản tham chiếu (2025–2026):** Helmet 8.x, cors 2.x, express-rate-limit 8.x, ws 8.x (WebSocket), SSE có sẵn trong Node. Tài liệu: https://cheatsheetseries.owasp.org/ và https://github.com/websockets/ws

## 1. Tổng quan — tấn công phổ biến và cách phòng thủ

| Tấn công | Cách phòng thủ |
|---|---|
| **XSS** (chèn script) | Helmet (CSP), escape output, HttpOnly cookie |
| **CSRF** | Cookie `SameSite`, CSRF token, không dùng cookie cho API thuần |
| **NoSQL Injection** | Zod validation, `sanitizeFilter`, không truyền `req.body` thẳng vào query |
| **Brute force** | Rate limiting, bcrypt, khóa tài khoản tạm thời |
| **DDoS** | Rate limit, CDN (Cloudflare), reverse proxy |
| **Rò rỉ dữ liệu** | HTTPS, không log dữ liệu nhạy cảm, ẩn field trong response |

## 2. Helmet — bảo mật HTTP headers

Helmet thiết lập các security header tự động:

```bash
npm install helmet
```

```js
import helmet from 'helmet';

app.use(helmet()); // cấu hình mặc định — đủ tốt cho đa số API

// Tinh chỉnh khi cần
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],        // không cho inline script
      imgSrc: ["'self'", 'data:'],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // nếu có ảnh/API bị client khác truy cập
}));
```

Helmet tự thiết lập: `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` (HTTPS), `X-Frame-Options`, bỏ header `X-Powered-By`...

## 3. CORS — Chia sẻ tài nguyên giữa các domain

Khi frontend ở `https://myapp.com` gọi API ở `https://api.myapp.com`, trình duyệt chặn vì **Same-Origin Policy**. CORS cho phép khai báo domain nào được gọi API.

```bash
npm install cors
```

```js
import cors from 'cors';

// Cấu hình nghiêm ngặt — KHÔNG dùng cors() trống trong production
const corsOptions = {
  origin: (origin, callback) => {
    const allowed = [
      'https://myapp.com',
      'http://localhost:5173', // Vite dev server
    ];
    if (!origin || allowed.includes(origin)) return callback(null, true);
    callback(new Error('Không được phép CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,              // cho phép gửi cookie
  maxAge: 86400,                   // cache preflight 1 ngày
};

app.use(cors(corsOptions));
```

> **Lưu ý:** `origin: '*'` tiện cho demo nhưng là rủi ro bảo mật. Còn `credentials: true` bắt buộc phải khai báo origin cụ thể (không được `*`).

## 4. Rate limiting — chặn brute-force và DDoS nhẹ

```bash
npm install express-rate-limit
```

```js
import rateLimit from 'express-rate-limit';

// Rate limit chung cho toàn API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  limit: 100,                // tối đa 100 request mỗi IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Quá nhiều yêu cầu, thử lại sau' } },
});
app.use('/api', apiLimiter);

// Rate limit NGHIÊM NGẶT cho login — chống brute-force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,                        // 5 lần đăng nhập sai trong 15 phút
  skipSuccessfulRequests: true,   // đăng nhập thành công không tính
  keyGenerator: (req) => req.body.email || req.ip, // chặn theo email
});

app.post('/api/v1/auth/login', loginLimiter, loginHandler);
```

Với app chạy sau reverse proxy nhiều tầng, cân nhắc dùng `rate-limit-redis` để đếm chính xác trên nhiều instance. Số đếm mặc định lưu trong bộ nhớ process — khi scale nhiều instance cần dùng Redis store.

## 5. Chống NoSQL Injection

```js
// ❌ NGUY HIỂM — client có thể gửi {"password": {"$gt": ""}} để bypass
const user = await User.findOne({ email: req.body.email, password: req.body.password });

// ✅ Validate trước bằng Zod
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72), // bcrypt giới hạn 72 bytes
});
const { email, password } = loginSchema.parse(req.body);

// ✅ Bảo vệ kép: sanitizeFilter với Mongoose
const user = await User.findOne({ email }, null, { sanitizeFilter: true });
```

## 6. WebSocket — giao tiếp hai chiều thời gian thực

HTTP là request/response một chiều. WebSocket là giao thức **full-duplex**: server và client gửi dữ liệu cho nhau bất cứ lúc nào — dùng cho chat, thông báo, dashboard real-time, game.

Thư viện: `ws` (nhẹ, thuần) hoặc `socket.io` (nhiều tính năng hơn: auto-reconnect, rooms, fallback). Series này dùng `ws`.

```bash
npm install ws
```

### Server

```js
// src/websocket/server.js
import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { parse } from 'node:url';

const server = createServer(app);           // app là Express app
const wss = new WebSocketServer({ server }); // gắn chung HTTP server, cùng port

// Xác thực khi client kết nối (qua query token hoặc header)
wss.on('connection', (ws, req) => {
  const { token } = parse(req.url, true).query;
  try {
    req.user = verifyAccessToken(token);
  } catch {
    ws.close(4001, 'Unauthorized');
    return;
  }

  console.log('Client kết nối:', req.user.sub);

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    // Broadcast cho tất cả client đang kết nối
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify({ from: req.user.sub, text: msg.text }));
      }
    }
  });

  ws.on('close', () => console.log('Client ngắt kết nối'));

  // Ping/pong giữ kết nối — phát hiện client ngắt đột ngột
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

// Kiểm tra kết nối "chết" mỗi 30 giây
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);
```

### Client phía browser

```js
const ws = new WebSocket('ws://localhost:3000?token=YOUR_JWT');

ws.onopen = () => ws.send(JSON.stringify({ type: 'message', text: 'Xin chào!' }));
ws.onmessage = (event) => console.log('Nhận:', event.data);
ws.onclose = () => setTimeout(connect, 3000); // tự kết nối lại
ws.onerror = (err) => console.error('WS lỗi:', err);
```

> Nếu cần **rooms, broadcast theo nhóm, auto-reconnect client** — dùng **Socket.IO** (https://socket.io/): nó tự xử lý fallback long-polling, reconnection, room, namespace. `ws` phù hợp khi cần tối ưu hiệu năng và muốn kiểm soát hoàn toàn.

## 7. Server-Sent Events (SSE) — nhẹ hơn WebSocket

SSE: server **push một chiều** về client qua HTTP — đơn giản hơn WebSocket rất nhiều, tự kết nối lại, chạy qua HTTP thuần (proxy-friendly). Hợp với: thông báo, progress bar, cập nhật dashboard.

```js
// Server — Node.js thuần, không cần thư viện
app.get('/api/v1/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  // Gửi dữ liệu mỗi 5 giây
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ time: new Date(), cpu: process.cpuUsage() })}\n\n`);
  }, 5000);

  // Dọn dẹp khi client ngắt kết nối
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});
```

```js
// Client
const eventSource = new EventSource('/api/v1/notifications');
eventSource.onmessage = (e) => console.log('Nhận:', JSON.parse(e.data));
// EventSource tự động reconnect khi mất kết nối!
```

**SSE vs WebSocket:**

| | SSE | WebSocket |
|---|---|---|
| Hướng | Server → Client | Hai chiều |
| Giao thức | HTTP thuần | Giao thức riêng (ws://) |
| Tự reconnect | Có | Tự viết / dùng Socket.IO |
| Khi nào | Thông báo, feed, progress | Chat, game, cộng tác |

## 8. Thực hành tốt (Best practices) — Bảo mật

1. **Helmet ngay từ dòng đầu tiên** của middleware stack.
2. **CORS whitelist** — không dùng `origin: '*'` khi có credentials.
3. **Rate limit** mọi endpoint công khai, đặc biệt login/register/password reset.
4. **HTTPS bắt buộc** trên production — dùng reverse proxy (nginx/Caddy) hoặc Load Balancer.
5. **Đổi secret theo chu kỳ** và tách secret theo môi trường (dev/test/prod).
6. **Không log dữ liệu nhạy cảm** (mật khẩu, token, thẻ tín dụng).
7. Cập nhật dependencies định kỳ: `npm audit fix`, bật Dependabot/Renovate.
8. Với WebSocket, **xác thực trong handshake** (khi connection mở) chứ không chỉ ở message đầu.

## 9. Bài tập về nhà

1. Thêm Helmet + CORS + rate limit toàn cục vào API của bạn.
2. Viết rate limiter riêng cho `/auth/login` (5 lần/15 phút, chặn theo email).
3. Xây dựng WebSocket server: client gửi tên, server broadcast tin nhắn đến tất cả kết nối.
4. Thêm SSE endpoint `/api/v1/notifications/stream` gửi 1 tin nhắn mỗi 10 giây.

## 📚 Tài liệu tham khảo

- Helmet: https://helmetjs.github.io/
- CORS: https://developer.mozilla.org/docs/Web/HTTP/CORS
- express-rate-limit: https://github.com/expressjs/express-rate-limit
- WebSocket (ws): https://github.com/websockets/ws
- Socket.IO: https://socket.io/docs/v4/
- Server-Sent Events (MDN): https://developer.mozilla.org/docs/Web/API/Server-sent_events
- OWASP Node.js Security: https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html

→ *Bài tiếp theo: [Triển khai & Hệ sinh thái](../8_deployment_ecosystem/README.md)*
