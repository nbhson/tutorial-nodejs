# Bài 5: Thiết kế RESTful API

> **Phiên bản tham chiếu (2025–2026):** Express 5.3.x stable, validation khuyến nghị **Zod** (phổ biến nhất 2025) hoặc Joi; Mongoose 9.x. Tài liệu: https://expressjs.com/ và https://restfulapi.net/

## 1. REST là gì?

**REST (Representational State Transfer)** là phong cách kiến trúc cho API web. Ý tưởng cốt lõi:

- **Mọi thứ là tài nguyên (resource)** — user, post, order... mỗi tài nguyên có URL riêng.
- **Dùng HTTP method đúng nghĩa**: GET đọc, POST tạo, PUT/PATCH sửa, DELETE xóa.
- **Stateless**: mỗi request chứa đủ thông tin để xử lý (không nhớ trạng thái trên server giữa 2 request).
- **Trả về đúng status code** để client hiểu điều gì xảy ra.

### Thiết kế URL chuẩn

| Thao tác | Method | URL | Status |
|---|---|---|---|
| Lấy danh sách | GET | `/api/v1/posts?page=1&limit=10` | 200 |
| Lấy 1 bài | GET | `/api/v1/posts/:id` | 200 / 404 |
| Tạo mới | POST | `/api/v1/posts` | 201 |
| Cập nhật toàn bộ | PUT | `/api/v1/posts/:id` | 200 / 404 |
| Cập nhật một phần | PATCH | `/api/v1/posts/:id` | 200 / 404 |
| Xóa | DELETE | `/api/v1/posts/:id` | 204 / 404 |

**Quy tắc đặt tên:** danh từ số nhiều (`/posts` chứ không `/getPosts`), lồng nhau tối đa 2 cấp (`/users/:id/posts`), từ khóa filter bằng query string (`/posts?status=published&sort=-createdAt`).

### Mã trạng thái HTTP quan trọng

- **2xx**: 200 OK, 201 Created, 204 No Content
- **3xx**: 301/302 redirect, 304 Not Modified
- **4xx**: 400 Bad Request, 401 Unauthorized (chưa đăng nhập), 403 Forbidden (không đủ quyền), 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 429 Too Many Requests
- **5xx**: 500 Internal, 502/503 lỗi phụ thuộc

> Phân biệt hay nhầm: **401** = "mày là ai?" (chưa xác thực); **403** = "ta biết mày là ai nhưng không được phép".

## 2. Cấu trúc dự án REST API hoàn chỉnh

```
src/
├── app.js
├── server.js
├── routes/
│   └── post.routes.js
├── controllers/
│   └── post.controller.js
├── services/
│   └── post.service.js
├── models/
│   └── post.model.js
├── middlewares/
│   ├── error.js
│   └── validate.js
└── validators/
    └── post.schema.js
```

Luồng xử lý: **Route → Middleware(validate) → Controller → Service → Model**.

## 3. Validation với Zod

Zod là thư viện validation kiểu "schema-first" của TypeScript, giờ là lựa chọn phổ biến nhất (2025) — nhỏ gọn, trả lỗi chi tiết, tích hợp TypeScript tự nhiên.

```bash
npm install zod
```

```js
// src/validators/post.validator.js
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(3, 'Tiêu đề tối thiểu 3 ký tự').max(200),
  content: z.string().min(10),
  tags: z.array(z.string()).max(5).default([]),
  status: z.enum(['draft', 'published']).default('draft'),
  publishedAt: z.coerce.date().optional(),
});

export const updatePostSchema = createPostSchema.partial(); // mọi field tùy chọn

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sort: z.enum(['newest', 'oldest']).default('newest'),
});
```

### Middleware validate dùng chung

```js
// src/middlewares/validate.js
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });
  if (!result.success) {
    return res.status(400).json({
      error: 'Dữ liệu không hợp lệ',
      details: result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
  }
  Object.assign(req, result.data); // ghi đè bằng dữ liệu đã làm sạch
  next();
};
```

> **Bảo mật:** validation middleware còn là lớp chống injection — chỉ các field khai báo trong schema mới đi qua.

### Joi — lựa chọn thay thế

```js
import Joi from 'joi'; // npm i joi

const createPostSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  content: Joi.string().min(10).required(),
  tags: Joi.array().items(Joi.string()).max(5).default([]),
});

const { error, value } = createPostSchema.validate(req.body, {
  abortEarly: false, // trả về TẤT CẢ lỗi chứ không chỉ lỗi đầu tiên
});
```

## 4. Controller hoàn chỉnh với Mongoose

```js
// src/controllers/post.controller.js
import { Post } from '../models/post.model.js';
import { createPostSchema, listPostsSchema } from '../validators/post.validator.js';

export async function listPosts(req, res) {
  const { page, limit, sort } = listPostsSchema.parse(req.query);
  const filter = {};
  if (req.query.author) filter.author = req.query.author;

  const [items, total] = await Promise.all([
    Post.find(filter)
      .populate('author', 'username')
      .sort({ createdAt: sort === 'newest' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Post.countDocuments(filter),
  ]);

  res.json({
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getPost(req, res) {
  const post = await Post.findById(req.params.id).populate('author', 'username');
  if (!post) return res.status(404).json({ error: 'Không tìm thấy bài viết' });
  res.json(post);
}

export async function createPost(req, res) {
  const data = createPostSchema.parse(req.body);
  const post = await Post.create({ ...data, author: req.user.id });
  res.status(201).location(`/api/v1/posts/${post._id}`).json(post);
}

export async function updatePost(req, res) {
  const data = updatePostSchema.parse(req.body);
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    { $set: data },
    { new: true, runValidators: true }
  );
  if (!post) return res.status(404).json({ error: 'Không tìm thấy bài viết' });
  res.json(post);
}

export async function deletePost(req, res) {
  const post = await Post.findByIdAndDelete(req.params.id);
  if (!post) return res.status(404).json({ error: 'Không tìm thấy bài viết' });
  res.status(204).end(); // 204 = xóa thành công, không có body
}
```

```js
// src/routes/post.routes.js
import { Router } from 'express';
import * as posts from '../controllers/post.controller.js';

const router = Router();
router.route('/').get(posts.list).post(posts.create);
router.route('/:id')
  .get(posts.get)
  .put(posts.update)
  .delete(posts.remove);
export default router;
```

## 5. Phân trang, lọc, sắp xếp

Chuẩn phổ biến (kinh nghiệm từ các dự án lớn):

```js
// GET /api/v1/posts?page=1&limit=10&sort=-createdAt&filter[status]=published
res.json({
  data: [...],
  meta: { page: 1, limit: 10, total: 42, totalPages: 5 },
});
```

- Phân trang: dùng `page`/`limit` (offset) — đơn giản; hoặc **cursor-based** (`?after=<id>`) — ổn định khi dữ liệu thay đổi liên tục, không bị "nhảy trang".
- Sắp xếp: `?sort=-createdAt,title` (dấu `-` là giảm dần).
- Trả về **meta** để client biết còn trang nào.

## 6. API Versioning

Khi API đã có client dùng, bạn không được sửa "phá vỡ" (breaking change). Dùng version:

```js
// Cách 1: trong URL (phổ biến nhất, dễ thấy)
app.use('/api/v1/users', usersRouterV1);
app.use('/api/v2/users', usersRouterV2);

// Cách 2: qua header (REST "thuần")
app.use((req, res, next) => {
  req.apiVersion = req.get('Accept-Version') || 'v1';
  next();
});
```

Mẹo: giữ v1 tối thiểu khả năng phá vỡ — thêm field mới an toàn, nhưng xóa/đổi ý nghĩa field thì phải ra phiên bản mới.

## 7. Định dạng lỗi thống nhất

API tốt trả lỗi **nhất quán, có cấu trúc**:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": [
      { "field": "title", "message": "Tiêu đề tối thiểu 3 ký tự" }
    ]
  }
}
```

Trong Express 5, error handler trung tâm có thể chuẩn hóa mọi lỗi:

```js
export function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details: Object.values(err.errors).map((e) => ({
          field: e.path, message: e.message,
        })),
      },
    });
  }
  if (err.name === 'CastError') { // Mongoose: id không hợp lệ
    return res.status(400).json({ error: { code: 'INVALID_ID', message: 'ID không hợp lệ' } });
  }
  if (err.code === 11000) { // Mongoose: trùng unique key
    return res.status(409).json({ error: { code: 'DUPLICATE', message: 'Dữ liệu đã tồn tại' } });
  }
  const status = err.status || 500;
  res.status(status).json({ error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
}
```

## 8. Tài liệu API với OpenAPI/Swagger

Chuẩn 2025: **OpenAPI 3.1** + `swagger-ui-express` hoặc **Scalar** (giao diện đẹp, mới hơn):

```bash
npm install swagger-ui-express
npm install -D openapi-typescript
```

```js
import swaggerUi from 'swagger-ui-express';
import spec from './docs/openapi.json' with { type: 'json' };

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
```

Hoặc dùng `zod-to-openapi` để sinh spec **tự động từ Zod schemas** — không phải viết 2 lần.

## 9. Thực hành tốt (Best practices)

1. **Danh từ số nhiều, không động từ**: `/posts` ✅, `/getAllPosts` ❌.
2. **Trả đúng status code** — client dựa vào nó để xử lý, đừng trả 200 kèm `{error: true}`.
3. **Validate mọi input từ client** (body, query, params) — whitelist hơn là blacklist.
4. **Không bao giờ trả `_id` nội bộ nếu dùng ObjectId ở client** nếu không cần thiết; cân nhắc slug/UUID public.
5. **Pagination luôn có** cho list endpoint — không bao giờ trả nguyên bảng.
6. **Idempotency**: PUT/DELETE idempotent; POST nên hỗ trợ header `Idempotency-Key` nếu gọi lại khi timeout.
7. **Đặt CORS, rate limit ngay từ đầu** (bài 7), đừng đợi đến khi "xong tính năng".
8. Log request/response với morgan/pino (bài 8) để debug dễ.

## 10. Bài tập về nhà

1. Xây dựng đầy đủ CRUD `/api/v1/categories` với Mongoose + Zod validation.
2. Thêm phân trang + filter + sort cho danh sách (trả cả meta).
3. Chuẩn hóa mọi lỗi về format `{ error: { code, message, details } }`.
4. Thêm Swagger UI xem tài liệu API của bạn.

## 📚 Tài liệu tham khảo

- RESTful API design: https://restfulapi.net/
- Express routing: https://expressjs.com/en/guide/routing.html
- Zod: https://zod.dev/
- Joi: https://joi.dev/api/
- OpenAPI Specification: https://spec.openapis.org/oas/latest.html
- HTTP status codes: https://developer.mozilla.org/docs/Web/HTTP/Status

→ *Bài tiếp theo: [Authentication](../6_authentication/README.md)*
