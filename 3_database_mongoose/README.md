# Bài 3: Làm việc với MongoDB qua Mongoose

> **Phiên bản tham chiếu (đã xác minh 10/2026):** Mongoose **9.x (9.11+) là bản mới nhất**; **8.x (8.24+) vẫn được bảo trì** và cú pháp gần như tương đồng 100%. Series này dùng Mongoose 9, mọi ví dụ đều chạy trên 8.x. Tài liệu: https://mongoosejs.com/docs/

## 1. Mongoose là gì? Vì sao cần ODM?

MongoDB là database NoSQL dạng document — dữ liệu lưu dưới dạng JSON-like (BSON). Nhưng MongoDB **không ép cấu trúc** chặt chẽ, còn ứng dụng thì cần dữ liệu có hình dạng nhất định.

**Mongoose là một ODM (Object Data Modeling)** — lớp trung gian giữa ứng dụng Node.js và MongoDB, cung cấp:

- **Schema**: định nghĩa cấu trúc, kiểu dữ liệu, validation cho collection
- **Model**: lớp thao tác CRUD với đầy đủ type casting
- **Middleware (hooks)**: chạy code trước/sau các sự kiện (save, delete...)
- **Populate**: "join" dữ liệu giữa các collection
- **Validation** tích hợp sẵn

So sánh: dùng MongoDB driver thuần bạn tự validate mọi thứ; với Mongoose, schema là "bộ luật" chung cho cả dự án.

## 2. Kết nối MongoDB

```bash
npm install mongoose
```

```js
// src/config/db.js
import mongoose from 'mongoose';

export async function connectDB(uri) {
  mongoose.set('strictQuery', true); // lọc field lạ trong query filter

  mongoose.connection.on('connected', () =>
    console.log('MongoDB: đã kết nối'));
  mongoose.connection.on('error', (err) =>
    console.error('MongoDB lỗi:', err.message));

  await mongoose.connect(uri); // Mongoose 6+ không cần options cũ nữa
}

// Graceful shutdown — đóng kết nối khi app tắt
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB: đã đóng kết nối');
  process.exit(0);
});
```

```js
// src/server.js
import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mydb';
await connectDB(uri);
app.listen(3000);
```

> **Lưu ý Mongoose 6+:** không cần `useNewUrlParser`, `useUnifiedTopology` nữa — chúng đã là mặc định và bị bỏ. Các tutorial cũ vẫn ghi những options này; đừng copy.

Connection string với MongoDB Atlas: `mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/ten-db`.

## 3. Schema — định nghĩa hình dạng dữ liệu

```js
// src/models/user.model.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Tên đăng nhập là bắt buộc'],
      unique: true,
      trim: true,
      minlength: [3, 'Tối thiểu 3 ký tự'],
      maxlength: 30,
      match: [/^[a-zA-Z0-9_]+$/, 'Chỉ cho phép chữ, số và gạch dưới'],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      validate: {
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: 'Email không hợp lệ',
      },
    },
    passwordHash: { type: String, required: true, select: false }, // select: false → không trả về trong query mặc định
    age: { type: Number, min: [0, 'Tuổi không âm'], max: 150 },
    roles: { type: [String], enum: ['user', 'admin'], default: ['user'] },
    isActive: { type: Boolean, default: true },
    profile: {          // subdocument lồng nhau
      bio: { type: String, maxlength: 500 },
      website: String,
    },
  },
  {
    timestamps: true,   // tự thêm createdAt, updatedAt
    versionKey: false,  // bỏ __v (nếu không cần)
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.passwordHash; // không bao giờ trả mật khẩu ra ngoài
        return ret;
      },
    },
  }
);

export const User = mongoose.model('User', userSchema);
// Tên collection sẽ là "users" (tự số nhiều, tự viết thường)
```

### Các SchemaType chính

`String`, `Number`, `Date`, `Buffer`, `Boolean`, `Mixed`, `ObjectId` (viết tắt `mongoose.Schema.Types.ObjectId`), `Array`, `Decimal128`, `Map`, `UUID`.

### Custom validation nâng cao

```js
const postSchema = new mongoose.Schema({
  tags: {
    type: [String],
    validate: {
      validator: (arr) => arr.length <= 5,
      message: 'Tối đa 5 tags',
    },
  },
  slug: {
    type: String,
    validate: {
      validator: async function (v) {
        // async validator — check trùng slug
        const exists = await mongoose.model('Post').exists({ slug: v });
        return !exists;
      },
      message: 'Slug đã tồn tại',
    },
  },
});
```

## 4. Model và CRUD đầy đủ

### Create

```js
// Cách 1: tạo document rồi save (chạy validation + hooks)
const user = new User({ username: 'son', email: 'son@example.com', passwordHash: 'xxx' });
await user.save();

// Cách 2: shorthand
const user2 = await User.create({ username: 'lan', email: 'lan@example.com', passwordHash: 'x' });

// Cách 3: tạo nhiều + bắt lỗi validation
try {
  await User.create([{ username: 'a' }], { validateBeforeSave: true });
} catch (err) {
  console.log(err.errors.email.message); // 'Email không hợp lệ'
}
```

### Read — Query builder

```js
// find + điều kiện
const adults = await User.find({ age: { $gte: 18 } });

// query chain — giống SQL nhưng theo kiểu builder
const result = await User
  .find({ isActive: true })
  .select('username email age')     // chỉ lấy các field này (passwordHash đã bị loại nhờ select:false)
  .sort({ createdAt: -1 })          // mới nhất trước
  .limit(10)
  .skip(20)                         // phân trang
  .lean()                           // trả POJO thay vì Document — NHANH HƠN đáng kể khi chỉ đọc
  .exec();

// findOne, findById
const user = await User.findById(id);
const admin = await User.findOne({ roles: 'admin' });

// đếm và kiểm tra tồn tại
const count = await User.countDocuments({ isActive: true });
const exists = await User.exists({ username: 'son' });
```

Toán tử truy vấn hay dùng: `$gte`, `$lte`, `$in`, `$nin`, `$ne`, `$and`, `$or`, `$regex`, `$exists`.

### Update

```js
// validate + chạy hooks + trả document mới
const user = await User.findById(id);
user.age = 30;
await user.save();

// update trực tiếp — nhanh, không chạy validation/document middleware mặc định
await User.updateOne({ _id: id }, { $set: { age: 31 } });
await User.updateMany({ isActive: false }, { $set: { isActive: true } });

// findOneAndUpdate: trả về document — dùng nhiều trong REST API
const updated = await User.findByIdAndUpdate(
  id,
  { $set: { age: 32 } },
  { new: true, runValidators: true }  // new:true → trả bản MỚI; runValidators → vẫn validate
);
```

### Delete

```js
await User.deleteOne({ _id: id });
await User.deleteMany({ isActive: false });

const deleted = await User.findByIdAndDelete(id); // trả document đã xóa
```

## 5. Relationships và Populate

MongoDB không có JOIN, nhưng Mongoose cung cấp `populate` để "nạp" dữ liệu liên quan qua `ref`.

```js
// src/models/post.model.js
const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
}, { timestamps: true });

export const Post = mongoose.model('Post', postSchema);
```

```js
// Tạo post tham chiếu user
const post = await Post.create({ title: 'Học Mongoose', content: '...', author: user._id });

// Populate: thay ObjectId bằng document thật
const postWithAuthor = await Post.findById(post._id).populate('author', 'username email');

// Populate lồng nhau
const posts = await Post.find()
  .populate({ path: 'comments', populate: { path: 'author', select: 'username' } });

// Populate có điều kiện
const activeAuthors = await Post.find().populate({
  path: 'author',
  match: { isActive: true },
  select: 'username',
});
```

> **Quy tắc vàng:** populate là 1 query riêng cho mỗi path. Với danh sách lớn, cân nhắc **denormalization** (lưu sẵn `authorName` trong post) hoặc dùng aggregation `$lookup`.

## 6. Middleware (Hooks) — can thiệp vòng đời document

Hooks chạy **trước/sau** các sự kiện: `save`, `validate`, `remove`, `findOneAndUpdate`...

```js
// Middleware ở tầng document
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next(); // chỉ hash khi mật khẩu đổi
  // ví dụ: gắn thêm logic trước khi lưu
  console.log('Chuẩn bị lưu user:', this.username);
  next();
});

userSchema.post('save', function (doc, next) {
  console.log('Đã lưu:', doc._id);
  next();
});

// Middleware ở tầng query — thường dùng cho soft delete
postSchema.pre(/^find/, function (next) {
  this.where({ deletedAt: null }); // mọi find() tự bỏ qua bản đã xóa
  next();
});

// Với update qua query (không chạy pre('save')!)
postSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});
```

Điểm dễ sai nhất: trong `pre('save')`, `this` là **document**; nhưng với `findOneAndUpdate`, `this` là **Query**. Lỗi kinh điển: đặt logic hash password trong `pre('save')` rồi dùng `findByIdAndUpdate` để đổi mật khẩu → **không chạy**! Giải pháp: thêm cả `pre('findOneAndUpdate')`.

### Instance methods, statics, virtuals

```js
// Instance method — gọi trên một document
userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash); // xem bài 6
};

// Static method — gọi trên Model
userSchema.statics.findActive = function () {
  return this.find({ isActive: true }).select('-passwordHash');
};

// Virtual — thuộc tính tính toán, không lưu DB
userSchema.virtual('greeting').get(function () {
  return `Xin chào, ${this.username}!`;
});
// Nhớ bật virtuals trong toJSON/toObject nếu muốn trả ra API
```

## 7. Transactions — nhiều thao tác, tính toàn vẹn

```js
const session = await mongoose.startSession();
try {
  await session.withTransaction(async () => {
    const order = await Order.create([{ items, total }], { session });
    await Account.updateOne(
      { _id: accountId },
      { $inc: { balance: -total } },
      { session }
    );
  }); // nếu có lỗi → tự rollback toàn bộ
} finally {
  await session.endSession();
}
```

> Transactions yêu cầu **replica set** (MongoDB Atlas đã có sẵn; MongoDB local standalone thì không). Với MongoDB 8+, local replica set dễ dựng qua `docker run --replSet`.

## 8. Thực hành tốt (Best practices)

1. **Dùng `.lean()` cho các query chỉ đọc** — trả plain object, nhanh hơn 5–10x với kết quả lớn.
2. **`select: false` cho field nhạy cảm** (mật khẩu, token) và `transform` trong toJSON.
3. **`timestamps: true`** ở mọi schema — luôn biết dữ liệu tạo/cập nhật lúc nào.
4. **Index ở những field hay query**: `schema.index({ username: 1 }, { unique: true })`. Trong production đặt `autoIndex: false` và quản lý index bằng migration.
5. **Không tin dữ liệu từ client**: luôn dùng `strict` mode (mặc định) và whitelist với `select`/`-` các field nhạy cảm.
6. **Có thể dùng `sanitizeFilter: true`** để chống injection operator khi filter từ `req.query`.
7. **Phân biệt rõ save() vs update**: cần hooks/validation → `save`; chỉ cập nhật nhanh → `updateOne`.
8. Với Mongoose 9: đọc [migration guide 8→9](https://mongoosejs.com/docs/migrating_to_9.html) nếu nâng cấp từ 8.

## 9. Bài tập về nhà

1. Tạo models `Category` và `Product` (1 category có nhiều product, populate ngược).
2. Viết static method `paginate(page, limit)` trên model Product.
3. Implement **soft delete**: field `deletedAt`, middleware `pre(/^find/)` loại bản đã xóa, method `softDelete()`.
4. Dùng transaction để chuyển tiền giữa 2 document `Account`.

## 📚 Tài liệu tham khảo

- Mongoose docs: https://mongoosejs.com/docs/
- Schemas: https://mongoosejs.com/docs/guide.html
- Validation: https://mongoosejs.com/docs/validation.html
- Middleware/Hooks: https://mongoosejs.com/docs/middleware.html
- Populate: https://mongoosejs.com/docs/populate.html
- Transactions: https://mongoosejs.com/docs/transactions.html
- Migration 8→9: https://mongoosejs.com/docs/migrating_to_9.html

→ *Bài tiếp theo: [Xử lý Bất đồng bộ](../4_async_handling/README.md)*
