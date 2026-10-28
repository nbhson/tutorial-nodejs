# Bài 0.5: Server-side Rendering (SSR) & Client-side Rendering (CSR)

> Cùng một ứng dụng web có thể được "vẽ" ở server hoặc ở trình duyệt của người dùng. Chọn sai mô hình sẽ ảnh hưởng trực tiếp tới tốc độ tải trang và SEO. Bài này giải thích bản chất hai mô hình, ưu/nhược điểm, và khi nào nên dùng cái nào.

## 1. Server-side Rendering (SSR) — render phía máy chủ

### Bản chất

**Mã nguồn HTML được trả về trực tiếp, hoàn chỉnh, từ server.** Trình duyệt chỉ cần nhận về là hiển thị được ngay — cách hoạt động truyền thống của web.

Cách kiểm chứng nhanh: mở trang web bất kỳ, nhấn `Ctrl + U` (hoặc `Cmd + Option + U`) để xem source:
- Nếu source có **nhiều nội dung HTML đầy đủ** (có cả nội dung bài viết, sản phẩm...) → trang đó dùng SSR.

```
Client                    Server
  |  --- GET /about ----->   |
  |                          | - query database
  |                          | - ghép data vào template
  |  <--- HTML hoàn chỉnh -- |   (Handlebars, EJS, Pug, PHP...)
  |  render & hiển thị       |
```

### Ưu điểm

- **SEO tối ưu**: bot của Google/Bing đọc được nội dung ngay trong HTML trả về, không cần chạy JavaScript → tăng thứ hạng tìm kiếm.
- **Nhanh hơn ở lần truy cập đầu tiên** (First Contentful Paint sớm): người dùng thấy nội dung ngay khi HTML về, không phải chờ tải + chạy JS.
- **Tốt cho thiết bị yếu**: ít công việc dồn lên máy client.
- **Dữ liệu nhạy cảm an toàn hơn**: gọi API/database ngay trên server, không lộ token ra trình duyệt.

### Nhược điểm

- Mỗi lần chuyển trang phải request lại server → **tải chậm hơn ở các lần chuyển trang sau** so với CSR đã load sẵn app.
- Server phải tính toán render HTML cho mỗi request → tốn tài nguyên, cần cache.
- Trải nghiệm "app-like" (không tải lại trang) khó làm hơn.

## 2. Client-side Rendering (CSR) — render phía trình duyệt

### Bản chất

Server trả về một **khung HTML gần như rỗng** + các file JavaScript. Trình duyệt tải JS về, JS gọi API lấy dữ liệu rồi **tự render** nội dung vào DOM.

Cách kiểm chứng: `Ctrl + U` sẽ thấy **ít code** — thường chỉ có một thẻ chứa app, ví dụ:

```html
<body>
  <div id="app"></div>
  <script src="/app.js"></script> <!-- JS sẽ tự render vào #app -->
</body>
```

Client tự render rồi mới đưa vào (append) thẻ đó. Framework tiêu biểu: React, Vue, Angular, Svelte.

```
Client                          Server
  |  --- GET / ---------------->   |
  |  <--- HTML rỗng + app.js ----  |
  |  chạy app.js                   |
  |  --- GET /api/courses -------> |
  |  <--- JSON ------------------- |
  |  JS render dữ liệu vào DOM     |
```

### Ưu điểm

- **Trải nghiệm app mượt**: sau lần tải đầu, chuyển trang gần như tức thì (SPA — Single Page Application), không reload.
- **Giảm tải cho server**: server chỉ lo trả JSON, không tốn CPU render HTML.
- **Tách biệt rõ frontend/backend**: backend là API thuần, frontend deploy riêng.

### Nhược điểm

- **Không tốt cho SEO** (theo cách hiểu truyền thống): Googlebot không tìm thấy thông tin trong HTML ban đầu vì client phải tải JS về rồi mới render. Lưu ý: Google hiện có thể render JS, nhưng chậm hơn, và nhiều bot/preview khác (facebook, twitter, công cụ tìm kiếm nội địa) thì không.
- **Chậm hơn ở lần truy cập đầu tiên** (phải tải + parse + chạy JS bundle trước khi thấy nội dung).
- Bundle lớn có thể lên tới vài trăm KB — ảnh hưởng trực tiếp tới chuyển đổi (conversion) trên mobile.

## 3. So sánh trực diện

| Tiêu chí | SSR | CSR |
|---|---|---|
| HTML trả về | Hoàn chỉnh | Rỗng (khung + JS) |
| Lần tải đầu tiên | Nhanh | Chậm hơn |
| Chuyển trang sau đó | Chậm hơn (reload/navigate) | Rất nhanh (SPA) |
| SEO | ✅ Tốt | ⚠️ Yếu / cần cấu hình thêm |
| Tài nguyên server | Tốn (render mỗi request) | Nhẹ (chỉ trả JSON) |
| Tài nguyên client | Nhẹ | Nặng (render toàn bộ UI) |
| Độ phức tạp | Đơn giản, truyền thống | Cần framework SPA |
| Ứng dụng điển hình | Báo điện tử, shop, landing page | Dashboard, web app nội bộ, mạng xã hội đã đăng nhập |

## 4. Kết hợp cả hai — thực tế 2026

> Trong một trang web, có những phần cần SEO thì cần SSR (tiêu đề, nội dung chính, danh sách sản phẩm). Còn những phần không cần SEO (bảng điều khiển sau đăng nhập, thông báo realtime...) thì chỉ cần CSR là đủ.

Các mô hình lai hiện đại đều sinh ra từ nhu cầu "lấy điểm mạnh cả hai":

- **Universal/Isomorphic SSR**: code chạy ở cả server lẫn client — Next.js (React), Nuxt (Vue), SvelteKit. Lần đầu trả HTML (SSR cho SEO), sau đó "tiếp quản" ở client (hydration) để chuyển trang như SPA.
- **Streaming SSR**: server gửi HTML từng phần sớm (Node.js có sẵn `res.flushHeaders()`; Next.js/Nuxt đã hỗ trợ sẵn) — người dùng thấy trang nhanh hơn nữa.
- **SSG (Static Site Generation)**: render HTML sẵn lúc build — nhanh nhất, hợp blog/tài liệu; Astro, VitePress dùng hướng này.
- **ISR/SSR + cache**: trang bán hàng render sẵn rồi tái tạo định kỳ.

Chính vì vậy bạn sẽ thấy một trang web thực tế **trộn cả hai**: phần SEO (trang chủ, trang chi tiết) dùng SSR, còn phần tương tác cao như dashboard, giỏ hàng, comment... để client render.

### SSR thuần với Express + Handlebars (chính là app ở bài sau)

```js
// server trả HTML hoàn chỉnh — đây chính là SSR
app.get('/', (req, res) => {
  res.render('home', { title: 'Khóa học Node.js' }); // server ghép data vào .hbs rồi gửi HTML
});
```

Bài [Education App](../3_education-app/src/index.js) trong series này dùng đúng mô hình SSR với template engine Handlebars.

### CSR thuần trông như thế nào?

```js
// client fetch API rồi tự render vào DOM
const res = await fetch('/api/courses');
const courses = await res.json();
document.querySelector('#main').innerHTML = courses
  .map((c) => `<li>${c.name}</li>`)
  .join('');
```

## 5. Hydration — cây cầu giữa SSR và CSR

Khi bạn nghe Next.js/Nuxt "kết hợp SSR + SPA", trái tim của nó là **hydration**:

1. Server trả HTML hoàn chỉnh → người dùng **thấy nội dung ngay** (như SSR).
2. Sau đó, JavaScript của app vẫn được tải xuống và "gắn" vào HTML đó — từ thời điểm này, các sự kiện click, input, chuyển trang... hoạt động **như một SPA** (như CSR).

```
Lần đầu:  Server → HTML (SSR)  →  JS tải xong → "hydration"  →  app tương tác như CSR
```

Lợi ích: bạn vừa có SEO + tốc độ lần đầu (HTML sẵn), vừa có trải nghiệm mượt sau đó (SPA). Nhược điểm: phải tải **toàn bộ JS của app** dù HTML đã hiển thị → tương tác có thể "đơ" vài trăm ms trước khi hydration xong.

```js
// Streaming SSR với Node thuần — gửi HTML sớm từng phần
res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
res.write('<html><head><title>Shop</title></head><body>');
res.write('<h1>Sản phẩm hot</h1>'); // gửi ngay phần đầu
res.flushHeaders();
// ... query DB xong phần nào gửi phần đó
res.write('<ul><li>Khóa học Node.js 24</li></ul>');
res.end('</body></html>');
```

Framework (Next.js, Nuxt, SvelteKit) đã chuẩn hóa cơ chế streaming + hydration này cho bạn — bạn chỉ cần chọn mode: SSR, SSG, hay ISR cho từng route.

## 6. SEO ngày nay — CSR có còn "chết" không?

Câu trả lời thực tế 2026: **Googlebot có thể render JavaScript**, nhưng:

- Quá trình index chậm hơn nhiều lần (phải chờ JS chạy xong).
- Nhiều bot khác **không render JS**: preview khi share link (Facebook, Zalo, Slack), một số công cụ tìm kiếm, trình thu thập của AI...
- Cả Google khuyến nghị: nội dung quan trọng nên có trong HTML ban đầu.

Vì vậy nguyên tắc vẫn không đổi: **nội dung cần SEO → SSR/SSG**; nội dung sau đăng nhập, không cần bot đọc → CSR.

## 7. Ví dụ: SSR và CSR cùng sống trong một Express app

Website thực tế thường vừa SSR vừa CSR trong **cùng một** Express server: render HTML cho trang, trả JSON cho AJAX:

```js
// Server: cùng dữ liệu, hai cách "phục vụ"
app.get('/', (req, res) => {
  // SSR: render HTML hoàn chỉnh cho SEO + lần truy cập đầu
  Course.find({}).then((courses) => res.render('home', { courses }));
});

app.get('/api/courses', (req, res) => {
  // CSR: trả JSON cho client tự render (load more, filter, search...)
  Course.find({}).then((courses) => res.json(courses));
});
```

```html
<!-- home.hbs (SSR) — server render sẵn danh sách -->
<h1>Khóa học</h1>
<ul class="course-list">
  {{#each courses}}
    <li>{{this.name}}</li>
  {{/each}}
</ul>
<button id="load-more">Xem thêm</button>
```

```js
// client.js (CSR) — nút "Xem thêm" fetch JSON rồi tự render
document.querySelector('#load-more').addEventListener('click', async () => {
  const res = await fetch('/api/courses?page=2');
  const courses = await res.json();
  document.querySelector('.course-list').insertAdjacentHTML(
    'beforeend',
    courses.map((c) => `<li>${c.name}</li>`).join(''),
  );
});
```

Mẫu này (SSR cho khung + CSR cho tương tác) chính là cách rất nhiều website production vận hành trước khi Next.js/Nuxt phổ biến.

## 8. Tiêu chí chọn mô hình

- **Website nội dung, cần SEO** (blog, tin tức, marketing, thương mại điện tử) → SSR hoặc SSG.
- **Ứng dụng đăng nhập nội bộ, dashboard, admin** → CSR (không cần SEO, muốn tương tác mượt).
- **Muốn cả hai**: SSR trang chính + SPA bên trong, hoặc dùng Next.js/Nuxt (kết hợp linh hoạt từng route).
- Đã có API + team frontend mạnh, cần phát triển song song → CSR.

## 10. Tóm tắt

- **SSR**: server trả HTML hoàn chỉnh — SEO tốt, lần đầu nhanh; bot đọc được nội dung ngay.
- **CSR**: server trả khung + JS; client tự render — mượt khi dùng, yếu SEO, chậm lần đầu.
- Kiểm chứng nhanh bằng `Ctrl + U`: nhiều code = SSR, ít code = CSR.
- Hydration giúp "SSR lần đầu + SPA sau đó" — Next.js/Nuxt/SvelteKit đã làm sẵn.
- Website thật thường trộn: SSR phần cần SEO, CSR cho phần tương tác sau đăng nhập.

## 9. Bài tập

1. Dùng `Ctrl + U` kiểm tra 3 website bạn hay dùng — phân loại SSR hay CSR.
2. Xem tab Network của một trang CSR: request HTML đầu tiên chứa gì, request nào trả về dữ liệu thật?
3. Tìm 2 trang e-commerce dùng SSR và giải thích vì sao họ chọn SSR.
4. Tìm một trang dùng Next.js/Nuxt và thử `View Source` — bạn có thấy nội dung đầy đủ trong HTML không? Giải thích hydration.

## 11. Tài liệu tham khảo

- MDN — Client-side rendering: https://developer.mozilla.org/en-US/docs/Web/Applications/Single-page_applications
- Next.js — Server and Client Components: https://nextjs.org/docs/app/building-your-application/rendering/server-components
- Vue SSR Guide: https://vuejs.org/guide/scaling-up/ssr.html
- Web.dev — Rendering on the web: https://web.dev/rendering-on-the-web/

---

→ *Bài tiếp theo: [Express Framework](../2_express-framework/README.md)*
