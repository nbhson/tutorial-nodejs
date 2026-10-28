# Bài 4.5: Middleware trong Express 5

> Middleware là trái tim của Express. Hiểu được middleware là bạn hiểu được hầu hết mọi thứ trong Express: routing, body parsing, xác thực, ghi log... đều là middleware.

## 1. Middleware — Ý nghĩa

**Phần mềm trung gian** — đứng giữa request của client và response cuối cùng trong mô hình phần mềm:

```
Browser (client) ========= Request =========> [Middleware 1] -> [Middleware 2] -> Handler -> Server
Browser (client) <======== Response ======= Server
```

### Ví von dễ nhớ: bác bảo vệ

Giống như bác bảo vệ đứng trước tòa nhà sự kiện:

```
Nhà ==================> bác bảo vệ 1 (Middleware 1) → bác bảo vệ 2 (Middleware 2) → Tòa nhà sự kiện
Nhà <================== bác bảo vệ 1 (Middleware 1) ← bác bảo vệ 2 (Middleware 2) ← Tòa nhà sự kiện
```

Mỗi "bác bảo vệ" có thể:

- **Soát vé / kiểm soát** (validation): vé hợp lệ mới được đi tiếp
- **Cho phép vào** (`next()` — validation passed) / **không cho vào** (chặn lại, trả lỗi)
- **Chỉnh sửa / thay đổi**: dán thêm tem, ghi chú vào vé (nắn sửa `req`/`res` để handler sau dùng)

### Chức năng thường gặp của middleware

- Xác thực / phân quyền (authentication & authorization)
- Log request (morgan)
- Parse body (`express.json`, `express.urlencoded`)
- Chia sẻ giá trị của biến (đính kèm vào `req`) tới các handler/view phía sau
- Bắt lỗi tập trung (error handling middleware)
- Cấu hình bảo mật (Helmet, CORS, rate limiting — xem bài [Bảo mật & WebSockets](../7_security_websockets/README.md))

## 2. Middleware là một hàm như thế nào?

Một middleware là hàm nhận 3 tham số `(req, res, next)`:

```js
function logger(req, res, next) {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next(); // CHUYỂN quyền điều khiển sang middleware/handler tiếp theo
}
```

**Quy tắc sống còn:** trong middleware thông thường, bạn phải **luôn gọi `next()`** hoặc **kết thúc response** (`res.send()`, `res.json()`...). Nếu không làm gì cả, request sẽ bị "treo" — trình duyệt chờ mãi cho tới timeout.

```js
// ❌ SAI — request treo vĩnh viễn
app.use((req, res, next) => {
  console.log('request mới');
});

// ✅ ĐÚNG
app.use((req, res, next) => {
  console.log('request mới');
  next();
});
```

Đăng ký middleware bằng `app.use()`:

```js
import express from 'express';

const app = express();
app.use(logger); // áp dụng cho MỌI request
app.use('/admin', logger); // chỉ áp dụng cho path bắt đầu bằng /admin
```

## 3. Thứ tự đăng ký = thứ tự chạy

Middleware chạy **theo đúng thứ tự bạn đăng ký**. Sai thứ tự là một trong những bug phổ biến nhất với người mới:

```js
app.use(express.json()); // ✅ ĐĂNG KÝ TRƯỚC — req.body mới có dữ liệu

app.post('/courses', (req, res) => {
  console.log(req.body); // có dữ liệu
});

app.use(express.json()); // ❌ ĐĂNG KÝ SAU — handler ở trên nhận req.body = undefined
```

## 4. Bốn loại middleware trong Express

### 4.1. Application-level middleware

Gắn trực tiếp vào `app`:

```js
app.use((req, res, next) => { ... });            // mọi request
app.use('/courses', (req, res, next) => { ... }); // path /courses/*
app.get('/about', logger, handler);               // gắn vào 1 route cụ thể
```

### 4.2. Router-level middleware

Gắn vào `express.Router()` — cách app trong series này tổ chức (xem `src/routes/`):

```js
// routes/course.js
import express from 'express';
const router = express.Router();

// middleware chỉ chạy cho các route của /courses
router.use((req, res, next) => {
  console.log('Time:', Date.now());
  next();
});

router.get('/:slug', courseController.show);
```

### 4.3. Built-in middleware

Có sẵn trong Express:

```js
app.use(express.json());        // parse body JSON (fetch, axios...)
app.use(express.urlencoded({ extended: true })); // parse form HTML (Content-Type: application/x-www-form-urlencoded)
app.use(express.static('public')); // phục vụ file tĩnh
```

> **Express 5:** `express.urlencoded` mặc định `extended: false` (Express 4 mặc định `true`). App của series khai báo tường minh `extended: true` nên không bị ảnh hưởng.

### 4.4. Third-party middleware

Cài qua npm rồi đăng ký: `morgan`, `method-override`, `helmet`, `cors`, `cookie-parser`, `express-session`... Chính app Education App dùng 3 cái:

```js
app.use(morgan('combined'));       // http logger
app.use(methodOverride('_method')); // cho phép form HTML gửi PUT/PATCH/DELETE
```

## 5. Error-handling middleware — loại đặc biệt

Middleware xử lý lỗi có **4 tham số** `(err, req, res, next)` — Express nhận diện qua số lượng tham số:

```js
// Phải khai báo SAU CÙNG, sau mọi route
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});
```

Khi muốn báo lỗi, gọi `next(err)` — sẽ nhảy **thẳng** tới error middleware, bỏ qua mọi middleware thường ở giữa:

```js
app.get('/courses/:slug', (req, res, next) => {
  Course.findOne({ slug: req.params.slug })
    .then((course) => res.render('course/show', course))
    .catch(next); // .catch(next) = next(err) khi promise reject
});
```

### Async/await trong Express 5 — tin tốt

**Express 4** đã từng: `await` lỗi trong `async` handler mà quên `try/catch` → promise bị reject "lơ lửng", request treo, server không log gì. Từ **Express 5**, promise bị reject trong middleware/handler **tự động chuyển thành `next(err)`**:

```js
// Express 5 — không cần try/catch nữa!
app.get('/courses/:slug', async (req, res) => {
  const course = await Course.findOne({ slug: req.params.slug }); // lỗi sẽ tự đi tới error middleware
  res.render('course/show', course);
});
```

Đây là một trong những lý do lớn để chuyển sang Express 5 (xem [Express Framework](../2_express-framework/README.md)).

## 6. Middleware "nhớ" dữ liệu qua req

Middleware thường dùng để đính kèm dữ liệu cho handler sau:

```js
// middleware xác thực
function requireLogin(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: 'Bạn chưa đăng nhập' }); // chặn lại, không gọi next()
  }

  try {
    req.user = verifyToken(token); // gắn dữ liệu vào req cho handler sau dùng
    next();
  } catch {
    return res.status(403).json({ message: 'Token không hợp lệ' });
  }
}

// handler sau dùng được req.user
app.get('/me/courses', requireLogin, (req, res) => {
  res.json({ user: req.user });
});
```

> **Express 5 cần biết:** `req.body` trả về `undefined` (thay vì `{}` như Express 4) khi body chưa được parse; `req.query` giờ là getter chỉ đọc và dùng query parser "simple" mặc định.

## 7. Ví dụ tổng hợp — mini logger + guard

```js
import express from 'express';

const app = express();

// 1) logger — chạy với mọi request
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// 2) guard — chỉ áp dụng cho /api/admin/*
app.use('/api/admin', (req, res, next) => {
  if (req.headers['x-admin-key'] !== 'secret') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
});

app.get('/api/admin/stats', (req, res) => res.json({ users: 100 }));
app.get('/api/hello', (req, res) => res.json({ hello: 'world' }));

// 3) error middleware — đăng ký CUỐI CÙNG
app.use((err, req, res, next) => {
  res.status(500).json({ message: err.message });
});

app.listen(3000);
```

## 8. Bài tập

1. Viết middleware `requestCounter` đếm số request từ lúc server khởi động, in ra mỗi 10 request.
2. Viết middleware chặn mọi request có query `?block=1` và trả `403 Forbidden` — kiểm tra bằng curl.
3. Thêm middleware đo thời gian xử lý (như ví dụ 7) vào Education App của series, chạy và quan sát log.
4. Cố tình throw lỗi trong một handler và kiểm chứng Express 5 tự chuyển lỗi tới error middleware.

## 📚 Tài liệu tham khảo

- Express 5 — Using middleware: https://expressjs.com/en/5x/guide/using-middleware.html
- Express 5 — Error handling: https://expressjs.com/en/5x/guide/error-handling.html
- Express 5 — Migration guide (API đã thay đổi): https://expressjs.com/en/guide/migrating-5.html
- Morgan: https://github.com/expressjs/morgan
- Helmet: https://helmetjs.github.io/

---

→ *Bài trước: [RESTful API](../5_restful_api/README.md) — Bài tiếp theo: [Authentication](../6_authentication/README.md)*
