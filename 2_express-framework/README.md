# Bài 2: Express Framework

> **Phiên bản tham chiếu (đã xác minh 10/2026):** Express **5.3.x là bản stable hiện tại** (Express 5 chính thức stable từ tháng 3/2025 với bản 5.1). Express 4 chỉ dùng để bảo trì dự án cũ. Tài liệu: https://expressjs.com/

## 1. Express là gì?

**Express** là web framework tối giản (minimalist) và linh hoạt nhất cho Node.js. Nó cung cấp:

- Hệ thống **routing** (định tuyến URL → handler)
- Hệ thống **middleware** (chuỗi hàm xử lý request)
- Tiện ích cho **response** (json, redirect, file...), template engine, static files

Express 5 khác Express 4 thế nào? Những thay đổi quan trọng:

| Thay đổi | Express 4 | Express 5 |
|---|---|---|
| Promise rejection từ async handler | Tự treo (unhandled) | **Tự động chuyển vào error middleware** |
| `res.status(404).send()` ký tự không hợp lệ | Lỗi runtime | Ném lỗi rõ ràng |
| Wildcard route | `/route/*` | `/route/*splat` (hoặc `/*/{*splat}`) |
| Query parser mặc định | `extended` (qs) | `simple` (querystring) — tránh prototype pollution |
| `app.del()` | Có | Bỏ, chỉ còn `app.delete()` |
| `req.host` | Có hostname | Chỉ trả hostname (bỏ port) |

> **Quan trọng nhất:** trong Express 5, bạn có thể viết `async` handler mà **không cần try/catch** — lỗi promise tự động đi vào error-handling middleware. Đây là cải tiến lớn nhất.

## 2. Cài đặt và server đầu tiên

```bash
npm init -y
npm pkg set type=module
npm install express@5
```

```js
// server.js
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({ message: 'Xin chào từ Express 5!' });
});

app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});
```

Chạy: `node --watch server.js`.

## 3. Routing

Routing nghĩa là: ứng với một **phương thức HTTP** + **đường dẫn**, chạy một handler tương ứng.

```js
// Các phương thức HTTP
app.get('/users', handler);       // đọc danh sách
app.post('/users', handler);      // tạo mới
app.put('/users/:id', handler);   // thay thế toàn bộ
app.patch('/users/:id', handler); // cập nhật một phần
app.delete('/users/:id', handler);// xóa
```

### Route parameters và query

```js
// /users/42  →  req.params.id = "42"
app.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id });
});

// /search?q=node&page=2  →  req.query = { q: "node", page: "2" }
app.get('/search', (req, res) => {
  res.json({ q: req.query.q, page: Number(req.query.page ?? 1) });
});
```

### express.Router — tổ chức route theo module

Đây là cách tổ chức **chuẩn** cho dự án thực tế thay vì dồn hết vào `app`:

```js
// routes/users.routes.js
import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => res.json({ users: [] }));
router.get('/:id', (req, res) => res.json({ id: req.params.id }));
router.post('/', (req, res) => res.status(201).json({ created: true }));

export default router;
```

```js
// server.js
import express from 'express';
import usersRouter from './routes/users.routes.js';

const app = express();
app.use('/api/users', usersRouter);  // gắn router với tiền tố
```

### Route chaining

```js
router
  .route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);
```

## 4. Middleware — trái tim của Express

Middleware là **hàm nhận `(req, res, next)`**, xử lý request rồi gọi `next()` để chuyển sang middleware kế tiếp (hoặc kết thúc bằng gửi response). Luôn chạy theo thứ tự khai báo.

```js
// 1. Middleware toàn cục (global)
app.use(express.json());          // parse JSON body → req.body
app.use(loggerMiddleware);

function loggerMiddleware(req, res, next) {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next(); // QUAN TRỌNG: quên next() → request "treo" mãi
}

// 2. Middleware cho một route cụ thể
app.get('/admin', requireAuth, (req, res) => {
  res.json({ secret: 'dữ liệu riêng tư' });
});

// 3. Middleware có tham số (factory function)
const requireRole = (role) => (req, res, next) => {
  if (req.user?.role !== role) {
    return next(new Error('Không đủ quyền')); // next(err) → nhảy tới error handler
  }
  next();
};
```

Các middleware có sẵn/cần thiết thường dùng:

```bash
npm install cookie-parser morgan cors
```

```js
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // parse form data
app.use(cookieParser());
app.use(morgan('dev')); // log request
```

> Lưu ý: `body-parser` giờ đã được tích hợp trong Express qua `express.json()` / `express.urlencoded()`, không cần cài riêng.

## 5. Serving static files

```js
import path from 'node:path';

// http://localhost:3000/static/logo.png → ./public/logo.png
app.use('/static', express.static(path.join(process.cwd(), 'public')));
```

## 6. Error handling trong Express 5

### Lỗi đồng bộ và lỗi async (điểm mới của Express 5!)

```js
// ❌ Lỗi đồng bộ: throw trực tiếp — Express tự bắt
app.get('/sync-error', () => {
  throw new Error('lỗi đồng bộ');
});

// ✅ Lỗi async: trong Express 5 KHÔNG cần try/catch, promise reject tự vào error handler
app.get('/users/:id', async (req, res) => {
  const user = await findUser(req.params.id); // reject → error middleware
  res.json(user);
});

// Trong Express 4 bạn phải viết thủ công:
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await findUser(req.params.id);
    res.json(user);
  } catch (err) {
    next(err); // Express 5 tự động làm việc này
  }
});
```

### Error-handling middleware — phải đặt CUỐI cùng

```js
// error.middleware.js
export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Không tìm thấy đường dẫn' });
}

export function errorHandler(err, req, res, next) {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
```

```js
// server.js — thứ tự khai báo quyết định mọi thứ
app.use('/api/users', usersRouter);
app.use(notFoundHandler);   // sau tất cả route
app.use(errorHandler);      // luôn luôn cuối cùng
```

Lưu ý: error handler **phải có đủ 4 tham số** `(err, req, res, next)` — Express nhận diện qua số lượng tham số.

### Tạo lỗi có status code

```js
import httpError from 'http-errors'; // npm i http-errors

app.get('/users/:id', async (req, res) => {
  const user = await findUser(req.params.id);
  if (!user) {
    throw httpError(404, 'Không tìm thấy người dùng');
  }
  res.json(user);
});
```

## 7. Cấu trúc dự án Express 5 khuyến nghị

```
my-api/
├── src/
│   ├── server.js           # entry point
│   ├── app.js              # tạo app express (tách để dễ test)
│   ├── routes/             # định nghĩa route
│   ├── controllers/        # xử lý logic request/response
│   ├── services/           # business logic
│   ├── models/             # Mongoose models (bài 3)
│   ├── middlewares/        # auth, error handler, validate...
│   └── config/             # env, db connection
├── .env
└── package.json
```

Tách `app.js` và `server.js` là pattern phổ biến giúp test dễ dàng (không mở port khi import):

```js
// src/app.js
import express from 'express';
import usersRouter from './routes/users.routes.js';
import { errorHandler, notFoundHandler } from './middlewares/error.js';

const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);
app.use(notFoundHandler);
app.use(errorHandler);
export default app;

// src/server.js
import app from './app.js';
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API: http://localhost:${PORT}`));
```

## 8. Thực hành tốt (Best practices)

1. **Dùng Express 5 cho dự án mới** — hỗ trợ async/await native, an toàn hơn (query parser mặc định đơn giản).
2. **Tách routes → controllers → services** để code dễ test và dễ bảo trì.
3. **Luôn đặt `express.json()` trước các route** cần đọc body.
4. **Error handler luôn nằm cuối**, không quên return sau khi gửi response (tránh "Cannot set headers after they are sent").
5. **Không dùng `app.use(express.static('public'))` mà thiếu path tuyệt đối** — dùng `path.join(process.cwd(), 'public')`.
6. Sử dụng `res.locals` để truyền dữ liệu giữa các middleware.
7. Đặt prefix `/api` cho API routes, tách version ngay từ đầu (xem bài 5).

## 9. Bài tập về nhà

1. Tạo server Express 5 với route `/`, `/about`, và `/api/health` (trả `{ status: 'ok' }`).
2. Xây dựng `Router` cho `/api/posts` với đủ GET/POST/PUT/DELETE (dữ liệu tạm lưu trong mảng JS).
3. Thêm middleware log request và middleware kiểm tra header `x-api-key`; trả 401 nếu sai.
4. Tạo lỗi thử nghiệm ở một route async và xác nhận nó vào error middleware **mà không cần try/catch**.

## 📚 Tài liệu tham khảo

- Express chính thức: https://expressjs.com/
- Hướng dẫn routing: https://expressjs.com/en/guide/routing.html
- Middleware: https://expressjs.com/en/guide/using-middleware.html
- Error handling: https://expressjs.com/en/guide/error-handling.html
- Migration Express 4 → 5: https://expressjs.com/en/guide/migrating-5.html
- Express 5 API: https://expressjs.com/en/5x/api.html

→ *Bài tiếp theo: [Database với Mongoose](../3_database_mongoose/README.md)*
