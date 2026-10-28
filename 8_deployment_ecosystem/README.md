# Bài 8: Triển khai (Deployment) và Hệ sinh thái Production

> **Phiên bản tham chiếu (2025–2026):** Node 24 LTS, PM2 6.x, Docker + Docker Compose, Pino (logging nhanh nhất), Winston 3.x. Tài liệu: https://pm2.keymetrics.io/, https://docs.docker.com/

## 1. Chuẩn bị ứng dụng cho production

Trước khi deploy, ứng dụng cần những điều cơ bản sau:

```js
// src/server.js — entry point production
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 3000;

await connectDB(process.env.MONGODB_URI);

const server = app.listen(PORT, () => {
  console.log(`API chạy trên port ${PORT}`);
});

// Graceful shutdown — hoàn tất request đang xử lý rồi mới tắt
process.on('SIGTERM', () => {
  console.log('Nhận SIGTERM, đang tắt ứng dụng...');
  server.close(async () => {
    console.log('Đã đóng HTTP server');
    // đóng DB, Redis, các kết nối khác
    process.exit(0);
  });
});
```

**Graceful shutdown** rất quan trọng: khi Docker/Kubernetes gửi tín hiệu `SIGTERM`, ứng dụng phải dừng nhận request mới, hoàn tất các request đang xử lý, rồi mới thoát — nếu không người dùng sẽ nhận lỗi giữa chừng.

## 2. Biến môi trường

**Tuyệt đối không hard-code cấu hình** trong code (secret, DB URL, API key). Dùng `.env`:

```bash
# .env — KHÔNG commit file này
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/mydb
JWT_SECRET=chuoi-ngau-nhien-it-nhat-64-ky-tu
JWT_REFRESH_SECRET=secret-khac-hoan-toan
```

```js
// Cách 1: Node 20.6+ tích hợp sẵn — KHÔNG cần dotenv
node --env-file=.env server.js

// Cách 2: thư viện dotenv (dễ tích hợp, phổ biến hơn)
import 'dotenv/config'; // dòng đầu tiên của file entry
```

```bash
# .env.example — commit vào git để người khác biết cần biến nào
NODE_ENV=
PORT=
MONGODB_URI=
JWT_SECRET=
```

> **Lưu ý:** với Node 24, cú pháp `node --env-file=.env` là đủ cho đa số dự án. `dotenv` chỉ cần khi cần `dotenv-expand` (biến lồng nhau) hoặc nạp từ nhiều file.

**Quản lý biến môi trường trên production:** lưu trong hệ thống orchestrator (Docker secrets, Kubernetes Secrets, AWS Secrets Manager) — không commit, không ghi vào log.

## 3. PM2 — Process manager cho Node.js

PM2 giữ ứng dụng luôn chạy, tự restart khi crash, cân bằng tải nhiều CPU core.

```bash
npm install -g pm2
pm2 start server.js --name my-api          # chạy đơn giản
pm2 start server.js -i max                 # cluster mode — dùng hết số CPU core
pm2 status                                  # xem danh sách process
pm2 logs my-api                            # xem log
pm2 monit                                  # dashboard CPU/RAM
pm2 restart my-api --update-env            # restart sau khi đổi env
pm2 startup && pm2 save                    # tự khởi động cùng hệ điều hành
```

### File cấu hình PM2 (khuyến nghị)

```js
// ecosystem.config.js
export default {
  apps: [{
    name: 'my-api',
    script: './src/server.js',
    instances: 'max',        // hoặc số cụ thể: 4
    exec_mode: 'cluster',    // cluster = nhiều process chia sẻ port
    env: { NODE_ENV: 'development' },
    env_production: { NODE_ENV: 'production' },
    max_memory_restart: '512M', // tự restart khi vượt 512MB RAM
    out_file: './logs/out.log',
    error_file: './logs/error.log',
  }],
};
```

```bash
pm2 start ecosystem.config.js --env production
```

> **Cluster mode** cho phép cùng một ứng dụng chạy trên nhiều process — tận dụng CPU đa nhân. Lưu ý: dữ liệu in-memory (biến toàn cục, session trong RAM) **không dùng được** trong cluster mode — phải chuyển sang Redis.

## 4. Docker — đóng gói ứng dụng

### Dockerfile chuẩn cho Node.js 2025 (multi-stage)

```dockerfile
# ---- Stage 1: build dependencies ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- Stage 2: runtime ----
FROM node:24-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Chạy bằng user non-root — bảo mật bắt buộc
USER node

EXPOSE 3000

# Dùng dumb-init để nhận đúng tín hiệu SIGTERM
CMD ["node", "src/server.js"]
```

Điểm quan trọng:

- **`node:24-alpine`**: image nhẹ (~130MB), bản LTS mới nhất.
- **Multi-stage**: stage build và stage runtime tách nhau — image cuối gọn hơn nhiều.
- **`npm ci`** thay vì `npm install` — cài đúng theo lockfile, nhanh và deterministic.
- **`USER node`**: không chạy container bằng root.
- **`HEALTHCHECK`** (tùy chọn): `HEALTHCHECK CMD wget -qO- http://localhost:3000/api/health || exit 1`.

### docker-compose.yml (app + database)

```yaml
services:
  api:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/mydb
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:8
    volumes:
      - mongo-data:/data/db
    restart: unless-stopped

volumes:
  mongo-data:
```

```bash
docker compose up -d --build    # build và chạy
docker compose logs -f api      # xem log
docker compose down             # dừng
```

### .dockerignore

```
node_modules
.git
.env
logs
npm-debug.log
Dockerfile
.dockerignore
```

## 5. Logging với Pino / Winston

**Không dùng `console.log` trong production** — không có level, không cấu trúc, không thể tìm kiếm. Log production cần: **JSON structured**, có **level** (error/warn/info/debug), có **request id**.

### Pino — nhanh nhất hiện nay (khuyến nghị 2025)

```bash
npm install pino pino-http
```

```js
import pino from 'pino';
import pinoHttp from 'pino-http';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }  // dev: log màu đẹp
    : undefined,                  // prod: JSON thuần
});

// Middleware log request
app.use(pinoHttp({ logger }));

// Sử dụng
logger.info('Server đã khởi động');
logger.error({ err, userId }, 'Lỗi khi xử lý đơn hàng');
logger.child({ module: 'auth' }).info('Đăng nhập thành công');
```

### Winston — linh hoạt, nhiều transport

```bash
npm install winston winston-daily-rotate-file
```

```js
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'my-api' },
  transports: [
    new DailyRotateFile({ filename: 'logs/app-%DATE%.log', datePattern: 'YYYY-MM-DD', maxFiles: '14d' }),
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

export default logger;
```

**Pino vs Winston:** Pino nhanh hơn 5–10x, phù hợp hệ thống traffic lớn; Winston linh hoạt hơn với nhiều transport. Cả hai đều ổn — chọn một và dùng nhất quán toàn dự án.

### Logging trong môi trường container

Mẹo quan trọng 12-Factor: **log ra stdout/stderr**, không tự ghi file. Hệ điều hành/container orchestrator sẽ thu log (Docker logs, CloudWatch, ELK).

## 6. Health checks và monitoring

```js
// Route kiểm tra tình trạng ứng dụng — cần cho Docker/K8s/load balancer
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage().rss,
    timestamp: new Date().toISOString(),
  });
});
```

Với PM2: `pm2 monit` đã có sẵn. Với Kubernetes/Docker: cấu hình `HEALTHCHECK` trỏ đến `/api/health`.

Để giám sát sâu hơn: tích hợp **OpenTelemetry** (chuẩn mới 2025) hoặc các SaaS như Sentry, Datadog.

## 7. Checklist production

- [ ] `NODE_ENV=production`
- [ ] Biến môi trường trong orchestrator, không commit
- [ ] HTTPS (qua reverse proxy/CDN)
- [ ] Rate limit + Helmet
- [ ] Log JSON có request id, đẩy về hệ thống tập trung
- [ ] Graceful shutdown (`SIGTERM` handler)
- [ ] Health check endpoint
- [ ] Cluster mode hoặc nhiều instance để HA
- [ ] Database backup định kỳ
- [ ] CI/CD pipeline (GitHub Actions) — test trước khi deploy

## 8. Bài tập về nhà

1. Viết `Dockerfile` multi-stage cho API của bạn và chạy `docker build -t my-api .`
2. Viết `docker-compose.yml` với MongoDB, chạy API + DB cùng nhau.
3. Cài PM2, chạy API với cluster mode (`-i max`), thử `pm2 reload` (zero-downtime restart).
4. Thay `console.log` bằng Pino, thêm `pino-http` middleware, kiểm tra log JSON.

## 📚 Tài liệu tham khảo

- PM2: https://pm2.keymetrics.io/docs/usage/quick-start/
- Docker Node.js guide: https://docs.docker.com/language/nodejs/
- Dockerfile best practices: https://docs.docker.com/develop/develop-images/dockerfile_best-practices/
- Pino: https://getpino.io/
- Winston: https://github.com/winstonjs/winston
- The Twelve-Factor App: https://12factor.net/
- Node.js production best practices: https://expressjs.com/en/advanced/best-practice-performance.html

---

*🎉 Chúc mừng bạn đã hoàn thành series! Hãy thử xây dựng một API hoàn chỉnh và deploy thật — thực hành là cách học nhanh nhất.*
