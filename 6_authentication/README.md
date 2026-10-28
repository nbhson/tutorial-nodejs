# Bài 6: Authentication và Authorization

> **Phiên bản tham chiếu (2025–2026):** JWT (jsonwebtoken 9.x), bcrypt (14.x), các best practice 2025: rate-limit token, short-lived access token + refresh token rotation, HttpOnly cookies cho web. Tài liệu: https://jwt.io/introduction, https://cheatsheetseries.owasp.org/

## 1. Các phương pháp xác thực

| Phương pháp | Khi nào dùng | Lưu trữ token |
|---|---|---|
| **Session-based** | Web truyền thống (SSR, server-rendered) | Server-side session store (Redis) + cookie |
| **JWT (stateless)** | API SPA/mobile, microservices | Client-side (localStorage hoặc HttpOnly cookie) |
| **OAuth 2.0 / OIDC** | Đăng nhập bằng Google, GitHub... | Qua authorization server |
| **API Key** | Machine-to-machine, webhook | Header `X-API-Key` |

Series này tập trung vào **JWT + refresh token** (phổ biến nhất cho REST API) và giới thiệu OAuth 2.0.

## 2. Hash mật khẩu với bcrypt

**Không bao giờ lưu mật khẩu dạng plain text**, không mã hóa (encryption) — luôn dùng **one-way hashing** (không có cách giải mã). bcrypt là thuật toán chuẩn công nghiệp từ 1999, hiện vẫn an toàn.

```bash
npm install bcrypt
```

```js
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12; // 2025: 12 là điểm cân bằng tốc độ/bảo mật; 10 vẫn chấp nhận được

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash); // trả boolean
}

// Sử dụng trong user model middleware
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.passwordHash = await hashPassword(this.password);
  next();
});
```

> bcrypt có `cost factor` (salt rounds). Mỗi +1 tăng gấp đôi thời gian hash, tăng bảo mật nhưng chậm hơn. 12 là mặc định khuyến nghị 2025 cho phần cứng hiện đại.

## 3. JWT — JSON Web Token

JWT là chuỗi gồm 3 phần cách nhau bởi dấu `.`:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4ifQ.abc123signature
```

| Phần | Nội dung |
|---|---|
| **Header** | `{ "alg": "HS256", "typ": "JWT" }` — thuật toán ký |
| **Payload** | Dữ liệu (claims) — KHÔNG chứa thông tin nhạy cảm (mật khẩu) |
| **Signature** | Chữ ký HMAC dùng secret key |

```bash
npm install jsonwebtoken
```

```js
import jwt from 'jsonwebtoken';

// Tạo token
export function generateTokens(user) {
  const accessToken = jwt.sign(
    {
      sub: user._id,
      email: user.email,
      roles: user.roles,
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }              // access token: ngắn hạn
  );

  const refreshToken = jwt.sign(
    { sub: user._id, jti: crypto.randomUUID() }, // jti: để revoke được
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}
```

JWT có 2 loại secret: `HS256` (symmetric — 1 key duy nhất) cho đa số dùng, `RS256` (asymmetric — public/private key pair) khi cần share verification với bên thứ ba.

### Xác minh token

```js
export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

// Middleware xác thực
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Thiếu access token' } });
  }
  try {
    req.user = verifyAccessToken(auth.slice(7));
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Token đã hết hạn' } });
    }
    return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token không hợp lệ' } });
  }
}

// Middleware kiểm tra quyền
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.roles?.[0])) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Không đủ quyền truy cập' } });
    }
    next();
  };
}
```

## 4. Đăng ký và Đăng nhập

```js
// src/services/auth.service.js
import { User } from '../models/user.model.js';
import { generateTokens, verifyRefreshToken } from './jwt.js';

export async function register({ email, username, password }) {
  const existing = await User.exists({ $or: [{ email }, { username }] });
  if (existing) throw Object.assign(new Error('Email hoặc username đã tồn tại'), { status: 409 });

  const user = await User.create({ email, username, password }); // password middleware tự hash
  const tokens = generateTokens(user);

  return { user: user.toJSON(), ...tokens };
}

export async function login({ email, password }) {
  // select('+passwordHash') vì passwordHash có select: false
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw Object.assign(new Error('Email hoặc mật khẩu sai'), { status: 401 });

  const valid = await user.comparePassword(password);
  if (!valid) throw Object.assign(new Error('Email hoặc mật khẩu sai'), { status: 401 });

  const tokens = generateTokens(user);
  return { user: user.toJSON(), ...tokens };
}
```

### Refresh token rotation — an toàn nhất 2025

```js
// src/controllers/auth.controller.js
export async function refreshToken(req, res) {
  const { refreshToken: token } = req.body; // client gửi kèm

  const payload = verifyRefreshToken(token);

  // Kiểm tra token đã bị revoke (lưu trong Redis/db)
  const isRevoked = await RefreshToken.exists({ token, revoked: true });
  if (isRevoked) {
    // Token bị dùng lại sau khi revoke → có thể là attack → revoke TẤT CẢ token của user
    await RefreshToken.updateMany({ userId: payload.sub }, { revoked: true });
    throw Object.assign(new Error('Phát hiện tấn công replay, đăng nhập lại'), { status: 401 });
  }

  // Revoke token cũ, cấp token mới
  await RefreshToken.updateOne({ token }, { revoked: true });
  const user = await User.findById(payload.sub);
  const tokens = generateTokens(user);

  // Lưu refresh token mới
  await RefreshToken.create({ token: tokens.refreshToken, userId: user._id });

  res.json(tokens);
}
```

### Đăng xuất

```js
export async function logout(req, res) {
  const { refreshToken: token } = req.body;
  await RefreshToken.updateOne({ token }, { revoked: true });
  res.status(204).end();
}
```

## 5. OAuth 2.0 — Đăng nhập bằng Google

```bash
npm install passport passport-google-oauth20
npm install express-session
```

OAuth 2.0 là chuẩn "ủy quyền" — user cho phép ứng dụng của bạn truy cập tài khoản Google/GitHub mà **không cần biết mật khẩu**.

Flow chính: **Authorization Code + PKCE** (khuyến nghị 2025 cho cả web lẫn mobile):

```
1. User click "Đăng nhập Google"
2. Redirect user → Google → User đồng ý
3. Google redirect về /auth/google/callback?code=xxx
4. Backend dùng code + client_secret đổi lấy access_token từ Google
5. Dùng access_token lấy thông tin user từ Google API
6. Tạo/lấy user trong DB, tạo JWT → trả cho client
```

```js
// passport setup (Google Strategy)
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/user.model.js';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  let user = await User.findOne({ googleId: profile.id });
  if (!user) {
    user = await User.create({
      googleId: profile.id,
      email: profile.emails[0].value,
      username: profile.displayName,
    });
  }
  done(null, user);
}));

app.get('/auth/google', passport.authenticate('google', { scope: ['email', 'profile'] }));
app.get('/auth/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const tokens = generateTokens(req.user);
    // redirect về frontend kèm token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}`);
  }
);
```

## 6. Session-based Auth

Dùng khi ứng dụng dùng server-side rendering (Next.js SSR, EJS...):

```bash
npm install express-session connect-redis ioredis
```

```js
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'ioredis';

const redis = createClient();
await redis.connect();

app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,    // chặn JS đọc cookie
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',  // 'strict' bảo mật hơn nhưng chặn redirect từ same-site
    maxAge: 24 * 60 * 60 * 1000, // 1 ngày
  },
}));

// Sử dụng
app.post('/login', async (req, res) => {
  req.session.userId = user._id;
  req.session.role = user.roles[0];
  res.json({ message: 'Đăng nhập thành công' });
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.status(204).end();
});
```

## 7. Thực hành tốt (Best practices) — Authentication

1. **Luôn hash mật khẩu** bằng bcrypt (hoặc argon2 — chậm hơn nhưng an toàn hơn). Không bao giờ hash bằng SHA-256/MD5 thuần — không có salt.
2. **Access token ngắn hạn (5–15 phút)**, refresh token dài hơn (7–30 ngày).
3. **Refresh token rotation**: mỗi lần dùng refresh → revoke token cũ + cấp token mới → nếu token cũ bị dùng lại → có thể là attack → revoke tất cả.
4. **Lưu refresh token trong DB** và kiểm tra trạng thái revoke trước khi dùng.
5. **HttpOnly cookie** cho refresh token trên web — không JS nào đọc được (XSS thua).
6. **Rate-limit endpoint login** (xem bài 7) để chống brute-force.
7. JWT secret phải đủ dài (≥ 64 ký tự random), lưu trong env.
8. Không đặt thông tin nhạy cảm (mật khẩu, role nội bộ) trong JWT payload — payload chỉ dùng để truyền dữ liệu, không phải lưu trữ an toàn.
9. **Đăng xuất = revoke token** chứ không phải chỉ xóa phía client.

## 8. Bài tập về nhà

1. Cài đặt register + login trả JWT (access + refresh).
2. Viết middleware `requireAuth` và `requireRole` dùng được trong Express.
3. Cài refresh token rotation với revoke kiểm tra trong DB.
4. Cài đăng nhập Google OAuth bằng Passport.

## 📚 Tài liệu tham khảo

- JWT.io: https://jwt.io/
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- bcrypt docs: https://www.npmjs.com/package/bcrypt
- Passport.js: https://www.passportjs.org/
- OAuth 2.0 PKCE: https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-pkce
- Refresh Token Rotation: https://auth0.com/secure-credentials/refresh-tokens

→ *Bài tiếp theo: [Bảo mật & WebSockets](../7_security_websockets/README.md)*
