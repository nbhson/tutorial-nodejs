# Bài 1: Nền tảng Node.js

> **Phiên bản tham chiếu (đã xác minh 10/2026):** Node.js LTS mới nhất là **24.x (24.22 LTS)**, Node 22.x vẫn được bảo trì tới 2027, Node 26.x là bản "Current". Tài liệu chính thức: https://nodejs.org/docs

## 1. Node.js là gì?

**Node.js** là một môi trường chạy JavaScript (JavaScript runtime) bên ngoài trình duyệt, được xây dựng trên engine **V8** của Google Chrome. Nói đơn giản: JavaScript vốn chỉ chạy trong trình duyệt, nhưng nhờ Node.js bạn có thể chạy JS trên máy chủ, dòng lệnh, thậm chí trong thiết bị nhúng.

Điểm đặc biệt của Node.js:

- **Bất đồng bộ, không chặn (non-blocking I/O)**: một luồng duy nhất có thể phục vụ hàng nghìn kết nối đồng thời nhờ mô hình event-driven.
- **Hệ sinh thái khổng lồ**: npm là kho thư viện lớn nhất thế giới với hơn 2 triệu packages.
- **Một ngôn ngữ cho cả frontend và backend**, giúp giảm chi phí chuyển đổi ngữ cảnh.

**Khi nào nên dùng Node.js?** API REST, ứng dụng real-time (chat, WebSocket), microservices, công cụ CLI, streaming. **Khi nào không nên?** Tính toán nặng về CPU (render video, học máy) vì sẽ chặn event loop.

## 2. Kiến trúc cốt lõi

```
+--------------------------------------------+
|              Ứng dụng của bạn              |
+--------------------------------------------+
|   Node.js Standard Library (fs, http...)   |
+---------------------+----------------------+
|      Bindings       |        libuv         |
|      (C/C++)        |  Event Loop +        |
|                     |  Thread Pool (I/O)   |
+---------------------+----------------------+
|              V8 JavaScript Engine          |
+--------------------------------------------+
```

- **V8**: biên dịch JS thành mã máy, cực nhanh.
- **libuv**: thư viện C cung cấp event loop và thread pool (mặc định 4 threads) cho các tác vụ I/O.
- **Event Loop**: trái tim của Node.js — vòng lặp xử lý callbacks qua các pha (timers, pending, poll, check, close). Hãy hình dung như một nhân viên nhà hàng: nhận đơn (request), đưa vào bếp (I/O hệ điều hành), và phục vụ món khi xong (callback) — không đứng chờ từng món.

### Kiểm tra kiến thức nhanh

```js
console.log('1');                       // đồng bộ — chạy ngay
setTimeout(() => console.log('2'), 0);  // pha timers
Promise.resolve().then(() => console.log('3')); // microtask — ưu tiên trước timers
console.log('4');                       // đồng bộ

// Kết quả: 1, 4, 3, 2
// Microtasks (Promise) luôn chạy xong trước khi event loop sang pha mới.
```

## 3. Cài đặt và quản lý phiên bản Node

Từ 2025, việc quản lý nhiều phiên bản Node gần như bắt buộc vì mỗi dự án cần phiên bản khác nhau. Ba công cụ phổ biến:

### nvm (phổ biến nhất)

```bash
# Cài nvm (macOS/Linux)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash

nvm install --lts        # cài bản LTS mới nhất (24.x)
nvm install 22           # cài một phiên bản cụ thể
nvm use 24               # chuyển phiên bản cho terminal hiện tại
nvm alias default 24     # đặt mặc định
```

### fnm (nhanh, viết bằng Rust — khuyến nghị 2025+)

```bash
brew install fnm         # macOS
fnm install --lts
fnm use lts-latest
```

### Volta (ghim phiên bản theo dự án)

```bash
curl https://get.volta.sh | bash
volta install node@24
```

> **Mẹo:** Thêm `"engines": { "node": ">=22" }` vào `package.json` để cảnh báo người dùng khi dùng sai phiên bản, và tạo file `.nvmrc` chứa `24` để `nvm use` tự nhận.

## 4. package.json — "CMND" của dự án

```bash
mkdir my-api && cd my-api
npm init -y              # tạo package.json nhanh
```

```json
{
  "name": "my-api",
  "version": "1.0.0",
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "node --watch server.js",
    "start": "node server.js",
    "test": "node --test"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

Những điểm quan trọng:

- **`"type": "module"`**: bật chế độ ES Modules — từ đây dùng `import/export` thay vì `require`. Đây là chuẩn được khuyến nghị cho code mới 2025+.
- **`dependencies` vs `devDependencies`**: thư viện chạy lúc runtime (express) vs chỉ lúc phát triển (eslint, prettier). Cài dev với `npm i -D`.
- **`scripts`**: lệnh tắt. `npm run dev`, hoặc `npm start` (không cần `run` cho `start`/`test`).
- **`^` và `~`**: `^1.4.2` cho phép nâng minor/patch (1.x.x), `~1.4.2` chỉ cho phép patch (1.4.x).
- **`package-lock.json`**: PHẢI được commit vào git — đảm bảo mọi máy cài đúng phiên bản y hệt.
- **`node_modules`**: KHÔNG commit — có trong `.gitignore`.

### Node.js 24: chạy TypeScript trực tiếp (type stripping)

Một trong những tính năng đáng chú ý nhất gần đây: từ Node 22.6+ (experimental) và ổn định dần trên Node 24, bạn có thể chạy file `.ts` trực tiếp mà không cần build:

```bash
node --experimental-strip-types app.ts   # Node 22
node app.ts                              # Node 24+ (đã bật sẵn ở mức experimental)
```

## 5. npm — trình quản lý package mặc định

```bash
npm install express          # cài và ghi vào dependencies
npm install -D nodemon       # cài vào devDependencies
npm install express@5        # cài đúng major version 5
npm update                   # nâng cấp theo range trong package.json
npm outdated                 # xem gói nào cũ
npm uninstall express        # gỡ
npm ci                       # cài sạch theo package-lock.json (dùng trong CI/Docker)
npm run dev                  # chạy script "dev"
```

### npm scripts nâng cao

```json
{
  "scripts": {
    "dev": "node --watch --env-file=.env server.js",
    "start": "NODE_ENV=production node server.js",
    "pretest": "npm run lint",
    "test": "node --test",
    "lint": "eslint ."
  }
}
```

- `node --watch` (có sẵn từ Node 18.11+): tự restart khi file thay đổi, **không cần nodemon nữa** cho đa số trường hợp.
- `node --env-file=.env` (Node 20.6+): nạp biến môi trường từ file `.env` **không cần thư viện dotenv**.
- Script `pretest` tự chạy trước `test` (quy ước prefix `pre`/`post`).

## 6. yarn và pnpm — các lựa chọn thay thế

| Công cụ | Điểm mạnh | Khi nào dùng |
|---|---|---|
| **npm** | Có sẵn, chuẩn chung, đủ tốt cho hầu hết trường hợp | Mặc định, dự án nhỏ |
| **pnpm** | Cực nhanh, tiết kiệm ổ đĩa (hard-link, content-addressable store), chống "phantom dependencies" | Dự án lớn, monorepo — **khuyến nghị 2025+** |
| **yarn** (berry) | Plug'n'play, workspaces tốt cho monorepo | Team đã dùng yarn |

```bash
# pnpm
npm install -g pnpm
pnpm install          # = npm install
pnpm add express      # = npm install express
pnpm -D add vitest    # = npm install -D vitest
```

> **Thực tế 2025:** nhiều dự án lớn (Vite, Svelte, Astro) đã chuyển sang pnpm. Nếu bạn mới bắt đầu, dùng npm là đủ; khi làm việc với monorepo hãy thử pnpm.

## 7. ES Modules — chuẩn hiện đại

Với `"type": "module"` trong package.json:

```js
// math.js
export function add(a, b) { return a + b; }
export default class Calculator {}

// server.js
import Calculator, { add } from './math.js';
import express from 'express';
import { readFile } from 'node:fs/promises';  // tiền tố node: cho module builtin
```

Điểm cần nhớ:

- Import builtin modules dùng tiền tố `node:` (vd `node:fs`, `node:http`) — nhanh hơn và rõ ràng hơn.
- ESM load **bất đồng bộ** và hỗ trợ **top-level await**:

```js
// server.js — top-level await hợp lệ trong ESM
import express from 'express';
const app = express();

const config = await import('./config.js');  // import động
app.listen(3000);
```

- Không có `__dirname` trong ESM. Thay thế:

```js
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

## 8. Chương trình "Hello World" đầu tiên

```js
// server.js — không cần framework nào cả
import { createServer } from 'node:http';

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'Xin chào từ Node.js 24!' }));
});

server.listen(3000, () => {
  console.log('Server chạy tại http://localhost:3000');
});
```

Chạy: `node --watch server.js`. Bạn thấy viết API thuần như vậy khá dài dòng → đó là lý do bài sau chúng ta học **Express**.

## 9. Thực hành tốt (Best practices)

1. **Luôn commit `package-lock.json`**, không commit `node_modules`.
2. **Dùng `"type": "module"`** cho dự án mới — CommonJS chỉ để bảo trì code cũ.
3. **Ghim engines** và dùng `.nvmrc` để đồng bộ phiên bản trong nhóm.
4. **Dùng `npm ci` trong CI/CD và Docker** — nhanh và deterministic hơn `npm install`.
5. **Kiểm tra lỗ hổng bảo mật**: `npm audit` định kỳ; cân nhắc `pnpm audit` / Renovate bot để tự cập nhật.
6. **Đừng chạy Node bằng root** trên production; dùng user riêng.
7. Với script dùng nhiều lần, đặt vào `package.json` thay vì gõ lệnh dài.

## 10. Bài tập về nhà

1. Cài Node 24 LTS bằng nvm/fnm, kiểm tra bằng `node -v`.
2. Tạo project `my-first-api` với `"type": "module"`, viết server HTTP thuần trả về JSON.
3. Cài `express` (bài sau sẽ dùng), thử `npm ls` để xem cây phụ thuộc.
4. Viết script `dev` dùng `node --watch`, thêm file `.env` và nạp bằng `--env-file`.

## 📚 Tài liệu tham khảo

- Node.js chính thức: https://nodejs.org/docs
- Lịch sử bản phát hành Node.js: https://nodejs.org/en/blog/release
- Giới thiệu event loop (official): https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick
- package.json docs: https://docs.npmjs.com/cli/v11/configuring-npm/package-json
- pnpm: https://pnpm.io/
- nvm: https://github.com/nvm-sh/nvm
- ESM chính thức: https://nodejs.org/api/esm.html

→ *Bài tiếp theo: [Express Framework](../2_express-framework/README.md)*
