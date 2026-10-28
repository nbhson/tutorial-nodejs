# 🚀 Tutorial Node.js Toàn Diện (2025–2026)

> Chào mừng bạn đến với series bài học Node.js toàn diện bằng tiếng Việt! Series này được cập nhật theo các phiên bản **mới nhất 2025–2026**: Node.js 24 LTS, Express 5, Mongoose 9, ES Modules, Docker và các thực hành bảo mật hiện đại.

## 📌 Thông tin phiên bản đã xác minh (tháng 10/2026)

| Công nghệ | Phiên bản ổn định mới nhất | Ghi chú |
|---|---|---|
| Node.js LTS | **24.22.x "Krypton"** (24.22.1 — 21/10/2026) | Node 24 là Active LTS (hỗ trợ tới 4/2028); Node 22 Maintenance LTS; Node 26 vừa vào LTS tháng 10/2026 |
| Express | **5.3.x (5.3.0 — 9/10/2026)** | Express 5.0 ra mắt 9/2024, mặc định trên npm từ 3/2025; Express 4 chỉ còn bảo trì |
| Mongoose | **9.x (9.11+)** | 8.x vẫn được bảo trì, cú pháp gần như giống nhau |
| ES Modules | `import/export` | Toàn bộ ví dụ dùng ESM, không còn CommonJS `require` |

> Lịch sử bản phát hành: https://nodejs.org/en/blog/release • Express releases: https://github.com/expressjs/express/releases

## 🗺️ Lộ trình học

| # | Bài học | Nội dung chính |
|---|---|---|
| 0 | [HTTP Protocol](./1_http-protocol/README.md) | Cách web vận chuyển dữ liệu: request methods, status codes, HTTPS, HTTP/2 & HTTP/3 |
| 0.5 | [SSR & CSR](./2_ssr-and-csr/README.md) | Server-side vs Client-side rendering, SEO, khi nào dùng mô hình nào |
| 1 | [Nền tảng Node.js](./1_nen-tang/README.md) | Node.js là gì, kiến trúc event loop, package.json, npm/yarn/pnpm, quản lý phiên bản Node |
| 1.5 | [Express Framework](./2_express-framework/README.md) | Express 5: routing, middleware, error handling, cấu trúc dự án |
| 2 | [Database với Mongoose](./3_database_mongoose/README.md) | Mongoose 9/8: schema, model, CRUD, populate, hooks, transactions |
| 3 | [Education App (dự án thực hành)](./3_education-app/) | Ứng dụng quản lý khóa học: Express 5 + ESM + Handlebars + Mongoose |
| 4 | [Xử lý Bất đồng bộ](./4_async_handling/README.md) | Callbacks → Promises → async/await, Promise.all, error handling |
| 4.5 | [Middleware](./4_middleware/README.md) | Bản chất middleware, 4 loại, error handling, async trong Express 5 |
| 5 | [RESTful API](./5_restful_api/README.md) | Thiết kế REST, CRUD endpoints, validation với Zod/Joi, versioning |
| 6 | [Authentication](./6_authentication/README.md) | JWT, bcrypt, refresh token, OAuth2, session-based auth |
| 7 | [Bảo mật & WebSockets](./7_security_websockets/README.md) | Helmet, CORS, rate limiting, WebSocket (ws), Server-Sent Events |
| 8 | [Triển khai & Hệ sinh thái](./8_deployment_ecosystem/README.md) | PM2, Docker, biến môi trường, logging với Winston/Pino |

**Gợi ý thứ tự:** nếu bạn mới học web backend, đi theo thứ tự: **HTTP Protocol → Nền tảng Node.js → SSR/CSR → Express → Middleware → Mongoose → Async → RESTful API → Authentication → Bảo mật → Deploy**, làm dự án Education App song song từ bài Express trở đi.

## 🎯 Mục tiêu sau khi hoàn thành

Bạn sẽ có khả năng:
- Hiểu cách **HTTP hoạt động** và xây dựng server từ thuần Node.js đến Express 5
- Xây dựng **RESTful API hoàn chỉnh** với Express 5 + Mongoose
- Hiểu sâu về **event loop** và lập trình bất đồng bộ trong Node.js
- Triển khai **authentication** an toàn (JWT + refresh token)
- Bảo mật ứng dụng theo chuẩn (Helmet, rate limiting, CORS)
- **Deploy** ứng dụng lên production với Docker/PM2, logging đúng cách

## 🛠️ Yêu cầu trước khi bắt đầu

- Biết cơ bản JavaScript (biến, hàm, object, mảng)
- Cài đặt Node.js 24 LTS (khuyến nghị: [dùng nvm hoặc fnm](./1_nen-tang/README.md)) — Express 5 yêu cầu Node 18 trở lên
- Một trình soạn thảo code (VS Code)
- (Từ bài 3) MongoDB — cài local hoặc dùng MongoDB Atlas miễn phí

## 💡 Cách học hiệu quả

1. **Gõ code theo tay** — đừng copy/paste, việc gõ giúp ghi nhớ tốt hơn nhiều.
2. **Chạy thử và "phá" code** — cố tình gây lỗi để xem lỗi trả về thế nào.
3. Làm theo thứ tự bài học, mỗi bài xây dựng trên bài trước.
4. Đọc thêm link tài liệu chính thức ở cuối mỗi bài.

## 🔗 Tài liệu chính thức

- Node.js: https://nodejs.org/docs
- Express: https://expressjs.com/
- Express 5 migration guide: https://expressjs.com/en/guide/migrating-5.html
- Mongoose: https://mongoosejs.com/docs/
- npm Docs: https://docs.npmjs.com/

---

*Bạn đã sẵn sàng? Bắt đầu với [Bài 0: HTTP Protocol](./1_http-protocol/README.md) →*
