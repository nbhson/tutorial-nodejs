/**
 * Install express
 * Install nodemon - tự động refresh server khi có thay đổi
 * Install morgan - log ra những info của client khi truy cập (http logger)
 * Install handlebars - template engine (html)
 * Install node-sass
 * Install bootstrap
 * Install prettier (format code) lint-staged (format code những file được add trong git) husky (tự động chạy)
 * Install mongoose - đứng giữa nodeJS & mongoDB, giúp app làm việc với DB | định nghĩa ra các field của một document trong collection có gì
 * Install mongoose-slug-generator - tạo slug name -> tao-slug-name
 * Install method-override - POST->PUT
 * Install mongoose-delete - soft delete
 *
 * localhost = 127.0.0.1
 * url bất kì đường dẫn nào trên internet - uri chỉ tồn tại duy nhất một đường dẫn
 */
const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const route = require('./routes/routes');
const DB = require('./config/db/index');
const methodOverride = require('method-override');

const app = express();
const port = 3000;

DB.connect();

/** config template */
const hbs = exphbs.create({
  extname: '.hbs',
});
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'resources', 'views')); // set views folder cho template - mỗi dấu , là một dấu / trong path

/** Use */
app.use(express.static(path.join(__dirname, '/public'))); // set public folder cho những file tĩnh
app.use(
  express.urlencoded({
    extended: true,
  }),
); // middleware xử lí cho req POST - qua html form
app.use(express.json()); // qua XMLHttpRequest, fetch, axios, ajax,... - qua thư viện khác
app.use(methodOverride('_method'));

/** Router */
route(app);

/** Middleware */
// app.get(
//   '/middleware',
//   function (req, res, next) {
//     // func middleware
//     if (req.query.ve && ['vethuong', 'vevip'].includes(req.query.ve)) {
//       req.face = 'Gach gach!!!';
//       return next(); // qua func middleware tiếp theo
//     }
//     res.status(403).json({
//       message: `Request invalid`,
//     });
//   },
//   function (req, res, next) {
//     // func middleware
//     res.json({
//       message: 'Successfully!',
//       face: req.face,
//     });
//   },
// );

/** Start Server */
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
