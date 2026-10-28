# Bài 0: HTTP Protocol — nền tảng của mọi ứng dụng web

> Trước khi viết server Node.js, bạn cần hiểu "ngôn ngữ" mà server nói chuyện với trình duyệt: **HTTP (HyperText Transfer Protocol)**. Bài này ngắn nhưng quan trọng — toàn bộ Express trong các bài sau đều xoay quanh hai khái niệm: **Request Method** và **Status Code**.

## 1. HTTP hoạt động như thế nào?

Cách thức website được truyền tải qua internet:

```
+----------+    request (GET /about)      +---------------------+
|  Client  | ----------------------------> |       Server        |
| (browser)| <---------------------------- | (máy chủ ở data     |
+----------+    response (HTML/JSON...)     |  center, VPS...)    |
                                              +---------------------+
```

- Website được lưu trữ ở một **máy chủ (server)** đặt tại data center hoặc cloud (địa chỉ máy chủ bạn có thể xem trong DevTools: **Tab Network → Headers → General → Remote Address**).
- Client gửi **request** kèm URL — dựa vào URL (và method) mà máy chủ biết được cần trả về cái gì.
- **Source code** (HTML, JSON, CSS, JS...) được trả về và trình duyệt sẽ đọc các mã nguồn đó để **render** và hiển thị (mở nhanh mã nguồn: `Ctrl + U` / `Cmd + Option + U`).

### Đặc điểm quan trọng của HTTP

- **Stateless**: mỗi request độc lập với nhau. Server không "nhớ" bạn giữa 2 lần gọi — đó là lý do ta cần cookie, session, JWT (xem bài [Authentication](../6_authentication/README.md)).
- **Request/Response model**: client chủ động hỏi, server trả lời. Server không thể tự đẩy dữ liệu cho client (muốn realtime thì dùng WebSocket/SSE — xem bài 7).
- **Độc lập với nội dung**: HTTP chỉ lo vận chuyển; bên trong có thể là HTML, JSON, hình ảnh, video...
- **Là nền của HTTPS**: HTTPS = HTTP + mã hóa TLS. Website production luôn nên dùng HTTPS (miễn phí qua Let's Encrypt).

### Một HTTP message trông như thế nào?

```http
# REQUEST
GET /courses/nodejs-tutorial HTTP/1.1
Host: example.com
User-Agent: Mozilla/5.0
Accept: text/html

# RESPONSE
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 1024

<!DOCTYPE html>...
```

Gồm 3 phần:
1. **Start line**: method + path (request) hoặc status code (response)
2. **Headers**: metadata (`Content-Type`, `Authorization`, `Cache-Control`...)
3. **Body**: dữ liệu (HTML, JSON, form data...) — GET thường không có body

## 2. Request Method

Các method chính, theo chuẩn RFC 9110:

### GET
Được sử dụng để **lấy thông tin** từ server theo URI đã cung cấp. Request GET chỉ **nhận dữ liệu**, không làm thay đổi dữ liệu (safe & idempotent). Dữ liệu nằm trong URL (query string), nên bị giới hạn độ dài và **không nên dùng để truyền thông tin nhạy cảm** (password, token...).

```http
GET /api/courses?page=2&limit=10
```

### HEAD
Tương tự như GET, nhưng server chỉ trả về **status line và headers**, không trả body. Dùng để kiểm tra resource có tồn tại không, hoặc đọc `Content-Length` trước khi tải file lớn.

### POST
Gửi dữ liệu tới server để **tạo mới** một resource. Ví dụ: gửi thông tin khách hàng, upload file, submit form. POST không idempotent — gọi 2 lần có thể tạo 2 bản ghi.

```http
POST /api/courses
Content-Type: application/json

{ "name": "Node.js cho người mới" }
```

### PUT
**Thay thế toàn bộ** resource hiện tại bằng nội dung gửi lên. Nếu resource chưa tồn tại, nhiều API cho phép tạo mới. PUT **idempotent**: gọi nhiều lần cho kết quả như nhau.

### PATCH
Thay đổi **một phần** của resource (so với PUT là thay toàn bộ). Ví dụ chỉ cập nhật `level` của một khóa học. Được thêm vào sau (RFC 5789) và rất hay dùng trong REST API hiện đại.

### DELETE
**Gỡ bỏ** resource được chỉ định bởi URI. Idempotent — xóa một resource đã xóa vẫn trả về kết quả thành công (hoặc 404, tùy thiết kế).

### CONNECT
Thiết lập một **tunnel** tới server được xác định bởi URI. Chủ yếu dùng cho HTTPS proxy: client nhờ proxy mở đường hầm mã hóa tới đích.

### OPTIONS
Miêu tả các **chức năng giao tiếp** được hỗ trợ cho resource — trả về các method được phép trong header `Allow`. Đây chính là method được dùng trong **CORS preflight** (trình duyệt gửi OPTIONS trước khi gọi API domain khác — xem bài 7).

### TRACE
Trình bày một vòng lặp kiểm tra (loop-back) thông điệp dọc theo đường đi tới server — dùng để debug xem request bị biến đổi ở hop nào. Hầu như luôn bị **tắt trên production** vì rủi ro lộ thông tin.

### Bảng tổng hợp: Safe & Idempotent

| Method | Mục đích | Safe (không đổi dữ liệu)? | Idempotent? | Có body? |
|---|---|---|---|---|
| GET | Đọc | ✅ | ✅ | Không |
| HEAD | Đọc headers | ✅ | ✅ | Không |
| POST | Tạo / xử lý | ❌ | ❌ | Có |
| PUT | Thay thế toàn bộ | ❌ | ✅ | Có |
| PATCH | Sửa một phần | ❌ | Không đảm bảo | Có |
| DELETE | Xóa | ❌ | ✅ | Hiếm |
| OPTIONS | Hỏi capabilities | ✅ | ✅ | Không |
| CONNECT | Tunnel (proxy) | ❌ | ❌ | Không |
| TRACE | Loop-back debug | ✅ | ✅ | Không |

> **Ghi nhớ:** *Safe* = không làm thay đổi trạng thái server. *Idempotent* = gọi 1 lần hay 100 lần, trạng thái cuối như nhau. POST là method duy nhất trong nhóm chính không idempotent — vì vậy cần cơ chế chống submit trùng (idempotency key) khi làm payment API.

## 3. HTTP Status Code

Status code là con số 3 chữ số trong dòng đầu của response, cho biết kết quả xử lý:

| Nhóm | Ý nghĩa |
|---|---|
| **1xx** | Thông tin — request đang được xử lý tiếp |
| **2xx** | Thành công |
| **3xx** | Sự điều hướng lại (redirect) |
| **4xx** | Lỗi phía client |
| **5xx** | Lỗi phía server |

### Các code bạn sẽ gặp nhiều nhất

**2xx — Thành công**

- `200 OK` — thành công (GET, PUT, PATCH...)
- `201 Created` — tạo mới thành công (POST). Nên kèm header `Location` trỏ tới resource mới
- `204 No Content` — thành công nhưng không trả về gì (DELETE, PUT không cần body)

**3xx — Redirect / Cache**

- `301 Moved Permanently` — chuyển hẳn sang URL mới (SEO ghi nhận URL mới)
- `302 Found` — tạm thời chuyển sang URL khác
- `304 Not Modified` — tài nguyên chưa đổi, client dùng cache (đi kèm `ETag`/`If-None-Match`)
- `307` / `308` — như 302/301 nhưng **bảo đảm giữ nguyên method** (không đổi POST → GET)

**4xx — Lỗi client**

- `400 Bad Request` — cú pháp/tham số sai
- `401 Unauthorized` — **chưa đăng nhập** (thiếu hoặc sai credentials)
- `403 Forbidden` — đã đăng nhập nhưng **không có quyền**
- `404 Not Found` — không tìm thấy resource
- `405 Method Not Allowed` — gọi POST vào endpoint chỉ nhận GET
- `409 Conflict` — xung đột trạng thái (vd: email đã tồn tại)
- `422 Unprocessable Content` — dữ liệu hợp lệ về cú pháp nhưng không qua được validation
- `429 Too Many Requests` — bị rate limit (xem bài 7)

**5xx — Lỗi server**

- `500 Internal Server Error` — lỗi chung của server
- `502 Bad Gateway` — server trung gian nhận phản hồi lỗi (thường gặp khi dùng nginx)
- `503 Service Unavailable` — server quá tải hoặc đang bảo trì

> **Lỗi kinh điển:** dùng 401 và 403 lẫn lộn. Cách nhớ: **401 = "bạn là ai?"** (chưa xác thực), **403 = "tôi biết bạn là ai, nhưng bạn không được phép"** (thiếu quyền).

### Thử nhanh với curl

```bash
curl -i https://httpbin.org/get           # xem đầy đủ headers + status
curl -i -X POST https://httpbin.org/post -H 'Content-Type: application/json' -d '{"a":1}'
curl -i https://httpbin.org/status/404    # tự tạo response 404 để quan sát
```

## 4. Thấy HTTP trong Node.js — vài dòng là đủ

```js
// http-demo.js — chạy: node http-demo.js
import { createServer } from 'node:http';

const server = createServer((req, res) => {
  console.log(req.method, req.url); // GET / — method & path client gửi lên

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Xin chào!' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(3000, () => console.log('http://localhost:3000'));
```

Bạn sẽ thấy: viết route bằng method + path thủ công khá dài dòng. Express (bài tiếp theo) chỉ là một lớp **đóng gói HTTP này lại cho gọn** — `app.get()`, `app.post()`, `res.status(201).json()`... đều là các shortcut của chính những gì bạn vừa thấy.

## 5. HTTP/1.1, HTTP/2, HTTP/3 — khác nhau thế nào?

| Phiên bản | Đặc điểm chính |
|---|---|
| HTTP/1.1 | Text-based, 1 request mỗi kết nối tại một thời điểm, head-of-line blocking |
| HTTP/2 | Nhị phân, **multiplexing** (nhiều request song song trên 1 kết nối), header compression |
| HTTP/3 | Chạy trên **QUIC/UDP** thay vì TCP, giảm độ trễ khi mất gói, khởi tạo kết nối nhanh |

Node.js 24 hỗ trợ HTTP/1.1 và HTTP/2 sẵn trong core (`node:http`, `node:http2`); HTTP/3 vẫn đang trong quá trình chuẩn hóa. Trên production, nginx hoặc CDN thường lo phần nâng cấp này giúp bạn.

## 6. Headers hay gặp nhất trong thực tế

Khi debug với DevTools, đây là những header bạn gặp nhiều nhất:

| Header | Ở đâu | Ý nghĩa |
|---|---|---|
| `Content-Type` | Cả 2 | Định dạng body: `text/html`, `application/json`, `application/x-www-form-urlencoded`... |
| `Authorization` | Request | Chứa token: `Authorization: Bearer <token>` (xem bài 6) |
| `Cookie` / `Set-Cookie` | Request / Response | Gửi/nhận cookie — nền tảng của session (xem bài 6) |
| `Cache-Control` | Response | Điều khiển cache: `no-cache`, `max-age=3600` |
| `ETag` / `If-None-Match` | Response / Request | Cặp đôi tạo ra response `304 Not Modified` |
| `Location` | Response (3xx/201) | Địa chỉ redirect hoặc resource mới tạo |
| `Access-Control-Allow-Origin` | Response | CORS — cho phép domain nào gọi API (xem bài 7) |
| `User-Agent` | Request | Thông tin trình duyệt/điện thoại của client |
| `Accept-Encoding` | Request | Client chấp nhận nén gì: `gzip`, `deflate`, `br` (Brotli) |

> Mẹo debug: mở DevTools → tab Network → chọn một request → tab **Headers** để xem đủ request/response headers; tab **Payload** xem body gửi lên; **Response** xem dữ liệu trả về.

## 7. Bài tập

1. Mở DevTools → tab Network, vào một trang bất kỳ, xác định: method nào được dùng nhiều nhất? Request đầu tiên trả về cái gì (HTML hay JSON)?
2. Chạy `http-demo.js` ở trên, thử truy cập `/` và `/khong-ton-tai` — quan sát status code.
3. Dùng curl gọi `https://httpbin.org/status/403` rồi tự trả lời: 401 và 403 khác nhau chỗ nào?
4. Tìm trong Network tab một request OPTIONS (preflight) và xem header `Access-Control-Allow-Origin`.

## 8. Tài liệu tham khảo

- MDN — An overview of HTTP: https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview
- MDN — HTTP methods: https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
- MDN — HTTP status: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status
- RFC 9110 (HTTP Semantics): https://httpwg.org/specs/rfc9110.html
- HTTP/3: https://developer.mozilla.org/en-US/docs/Web/HTTP/HTTP3

---

→ *Bài tiếp theo: [Server-side & Client-side Rendering](../2_ssr-and-csr/README.md)*
