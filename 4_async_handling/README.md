# Bài 4: Xử lý Bất đồng bộ trong Node.js

> **Phiên bản tham chiếu (2025–2026):** async/await là chuẩn mặc định; callbacks chỉ còn trong code legacy và các hàm Node lỗi thời. Từ Node 17.5+ có sẵn `fetch` toàn cục; Node 24 có sẵn `Promise.withResolvers`, `AbortSignal.any()`. Tài liệu: https://nodejs.org/api/async_hooks.html và https://developer.mozilla.org/docs/Web/JavaScript/Guide/Using_promises

## 1. Ba thế hệ xử lý bất đồng bộ

JavaScript đơn luồng — mọi tác vụ I/O (đọc file, gọi API, query DB) không được chặn luồng. Có 3 cách xử lý kết quả:

| Thế hệ | Kỹ thuật | Vấn đề |
|---|---|---|
| 1 | Callback | Callback hell, khó xử lý lỗi, pyramid of doom |
| 2 | Promise | Chuỗi `.then()` dài, vẫn rối khi logic phức tạp |
| 3 | **async/await** | Gần giống code đồng bộ, `try/catch` quen thuộc — **chuẩn hiện nay** |

### 1.1. Callback — thế hệ cũ (để đọc hiểu legacy)

```js
import { readFile } from 'node:fs';

// Node-style callback: (err, data) => {}
readFile('data.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('Lỗi:', err);
    return;
  }
  console.log(data);
});
```

Callback hell trông thế này:

```js
getUser(id, (err, user) => {
  if (err) return handleError(err);
  getOrders(user, (err, orders) => {
    if (err) return handleError(err);
    getDetails(orders[0], (err, detail) => {
      // lồng tiếp... 😱 "pyramid of doom"
    });
  });
});
```

Quy tắc với callback Node-style: **callback là tham số cuối, lỗi là tham số đầu** (`(err, data)`). Callback `fs/promises` hiện đại đã loại bỏ mô hình này.

### 1.2. Promise — đối tượng đại diện "kết quả tương lai"

Một Promise có 3 trạng thái: `pending` → `fulfilled` hoặc `rejected`. Một khi settled thì **không đổi nữa**.

```js
import { readFile } from 'node:fs/promises';

readFile('data.txt', 'utf8')
  .then((data) => {
    console.log(data);
    return process(data);        // return giá trị → then sau nhận được
  })
  .then((processed) => console.log(processed))
  .catch((err) => console.error('Lỗi:', err))  // bắt mọi lỗi phía trên
  .finally(() => console.log('Xong việc'));    // luôn chạy
```

### 1.3. async/await — đường (syntax) đẹp nhất

`async function` luôn trả về Promise. Bên trong, `await` tạm dừng hàm cho đến khi Promise settle.

```js
import { readFile } from 'node:fs/promises';

async function readConfig() {
  try {
    const raw = await readFile('config.json', 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { debug: false }; // giá trị mặc định khi file chưa tồn tại
    }
    throw err; // lỗi khác — ném tiếp cho caller
  }
}

// Top-level await (ESM): dùng ngay ngoài hàm
const config = await readConfig();
```

> **Lưu ý quan trọng:** `await` chỉ "đợi" trong phạm vi hàm async, **không chặn event loop** — Node vẫn phục vụ request khác trong lúc chờ.

## 2. Chạy song song: Promise.all, allSettled, any, race

Đây là kỹ năng **quan trọng nhất** trong thực tế — giải quyết bài toán "gọi nhiều tác vụ I/O không phụ thuộc nhau".

```js
// ❌ SAI — tuần tự, chậm: tổng thời gian = t1 + t2 + t3
const user = await fetchUser(id);
const posts = await fetchPosts(id);
const stats = await fetchStats(id);

// ✅ ĐÚNG — song song: tổng thời gian ≈ max(t1, t2, t3)
const [user, posts, stats] = await Promise.all([
  fetchUser(id),
  fetchPosts(id),
  fetchStats(id),
]);
```

Bốn tổ hợp:

| Hàm | Hành vi khi có lỗi | Kết quả |
|---|---|---|
| `Promise.all` | Reject ngay tại promise đầu tiên fail | Mảng kết quả theo thứ tự |
| `Promise.allSettled` | Không bao giờ reject | Mảng `{status, value/reason}` |
| `Promise.any` | Chờ promise đầu tiên **thành công** | Giá trị đầu tiên thành công |
| `Promise.race` | Trả khi promise đầu tiên **settle** (kể cả fail) | Giá trị/lỗi đầu tiên |

```js
// allSettled — khi bạn muốn mọi kết quả kể cả lỗi
const results = await Promise.allSettled([fetchUser(1), fetchUser(999)]);
for (const r of results) {
  if (r.status === 'fulfilled') console.log('OK:', r.value);
  else console.log('Fail:', r.reason.message);
}

// any — thử nhiều nguồn, lấy cái nào trả trước
const data = await Promise.any([fetchFromCDN1(), fetchFromCDN2()]);

// race + timeout thủ công
const result = await Promise.race([
  fetchSlowAPI(),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Quá 5 giây!')), 5000)
  ),
]);
```

## 3. Error handling với async/await

```js
// try/catch bắt mọi lỗi (đồng bộ + promise)
async function getUserProfile(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('Không tìm thấy user');
      err.status = 404;
      throw err;
    }
    return user;
  } catch (err) {
    if (err.status === 404) throw err;       // lỗi nghiệp vụ — ném tiếp
    console.error('DB lỗi:', err);            // lỗi hệ thống — log
    throw new Error('Lỗi máy chủ', { cause: err }); // Node 16.9+ hỗ trợ cause
  }
}
```

### Lỗi trong vòng lặp — cẩn thận với for...of và forEach

```js
// ❌ forEach KHÔNG đợi promise — lỗi sẽ thoát ra ngoài try/catch!
ids.forEach(async (id) => await process(id)); // lỗi unhandled!

// ✅ Chạy tuần tự (khi cần thứ tự hoặc tránh quá tải)
for (const id of ids) {
  await process(id);
}

// ✅ Chạy song song có kiểm soát
await Promise.all(ids.map((id) => process(id)));
```

### Timeout và hủy tác vụ với AbortController (chuẩn hiện đại)

```js
async function fetchWithTimeout(url, ms = 5000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// AbortSignal.any (Node 20+): nhiều nguồn hủy
const controller = new AbortController();
const combined = AbortSignal.any([controller.signal, AbortSignal.timeout(3000)]);
await fetch(url, { signal: combined });
```

## 4. Queueing — giới hạn độ song song

Chạy 10.000 request song song sẽ phá API đích. Dùng hàng đợi:

```js
async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function worker_loop() {
    while (index < items.length) {
      const i = index++;
      results[i] = await worker(items[i]);
    }
  }

  await Promise.all(Array.from({ length: limit }, worker_loop));
  return results;
}

// Chạy 100 tác vụ, tối đa 5 tác vụ cùng lúc
const results = await mapWithConcurrency(urls, 5, (u) => fetch(u).then(r => r.json()));
```

Trong code production, cân nhắc thư viện `p-limit`:

```js
import pLimit from 'p-limit';
const limit = pLimit(5);
const results = await Promise.all(urls.map((u) => limit(() => fetch(u).then(r => r.json()))));
```

## 5. Xử lý lỗi "rò rỉ" toàn cục

```js
// Bắt mọi lỗi chưa xử lý — PHẢI CÓ trong mọi ứng dụng Node
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  // log vào hệ thống giám sát rồi thoát để process manager restart (xem bài 8)
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
```

> Từ Node 15+, promise bị "quên catch" **tự làm crash process** (thay vì chỉ cảnh báo). Vì vậy `unhandledRejection` handler là mạng lưới an toàn bắt buộc.

## 6. Async patterns trong Express 5

```js
// Express 5 tự bắt lỗi từ async handler
app.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id); // reject → error middleware
  res.json(user);
});

// Retry với backoff — pattern phổ biến khi gọi API bên ngoài
async function retry(fn, times = 3, delayMs = 500) {
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, delayMs * 2 ** i)); // backoff nhân đôi
    }
  }
  throw lastErr;
}
```

## 7. Thực hành tốt (Best practices)

1. **Không trộn callback và promise** trong cùng luồng logic — chuyển callback cũ thành promise bằng `util.promisify` nếu cần.
2. **Ưu tiên `Promise.all` khi các tác vụ độc lập** — tiết kiệm thời gian nhiều lần.
3. **Không dùng `await` trong vòng lặp khi tác vụ độc lập** — đó là chạy tuần tự giả tạo.
4. **Luôn `catch` hoặc gắn handler** cho mọi promise; đừng để lỗi "bay" thành unhandled rejection.
5. **`Promise.allSettled`** khi bạn cần kết quả từng cái kể cả lỗi (vd: gửi notification đến 3 dịch vụ).
6. **Dùng `AbortSignal.timeout()`** thay vì tự viết timeout cho fetch.
7. Trong async function, **`return await x` thường thừa** (chỉ `return x`); ngoại lệ: khi nằm trong try/catch và bạn muốn bắt lỗi của promise đó.
8. Giới hạn độ song song (p-limit) khi gọi external API hàng loạt.

## 8. Bài tập về nhà

1. Viết hàm gọi 3 API song song bằng `Promise.all` và in tổng thời gian — so sánh với chạy tuần tự.
2. Xử lý tình huống 1 trong 3 API fail mà **không mất kết quả của 2 API kia** (`allSettled`).
3. Viết wrapper `withRetry(fn, n)` tự thử lại n lần với backoff.
4. Tạo một route Express nhận danh sách URL và fetch song song với giới hạn 3 tác vụ cùng lúc.

## 📚 Tài liệu tham khảo

- Using Promises (MDN): https://developer.mozilla.org/docs/Web/JavaScript/Guide/Using_promises
- async/await (MDN): https://developer.mozilla.org/docs/Learn/JavaScript/Asynchronous/Promises
- Promise API (MDN): https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise
- Event loop Node.js: https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick
- AbortController: https://developer.mozilla.org/docs/Web/API/AbortController
- p-limit: https://github.com/sindresorhus/p-limit

→ *Bài tiếp theo: [RESTful API](../5_restful_api/README.md)*
