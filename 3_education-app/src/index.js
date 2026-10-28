/**
 * Cac dependencies chinh cua project:
 *   express              - web framework
 *   nodemon              - tu dong refresh server khi co thay doi
 *   morgan               - log ra nhung info cua client khi truy cap (http logger)
 *   express-handlebars   - template engine (html)
 *   sass                 - compile SCSS sang CSS (thay the node-sass da bi khai tu)
 *   prettier             - format code
 *   mongoose             - dung giua nodeJS & mongoDB, giup app lam viec voi DB
 *   mongoose-slug-updater - tao slug tu ten: "Tao Slug Name" -> tao-slug-name
 *   method-override      - cho phep POST->PUT/PATCH/DELETE qua HTML form
 *   mongoose-delete      - soft delete
 *
 * localhost = 127.0.0.1
 * url bat ki duong dan nao tren internet - uri chi ton tai duy nhat mot duong dan
 *
 * Since Express 5 + ESM:
 *   - package.json co "type": "module" nen dung import/export thay vi require
 *   - Express 5 khong con ho tro res.redirect('back') - phai tu lay Referer
 *   - Promise bi reject trong handler se tu dong chuyen sang error middleware
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import morgan from 'morgan';
import exphbs from 'express-handlebars';
import methodOverride from 'method-override';

import route from './routes/routes.js';
import { connect as connectDB } from './config/db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const port = 3000;

// Ket noi MongoDB
connectDB();

/** config template */
const hbs = exphbs.create({
  extname: '.hbs',
});
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'resources', 'views')); // set views folder cho template

/** HTTP logger */
app.use(morgan('combined'));

/** Use */
app.use(express.static(path.join(__dirname, '/public'))); // set public folder cho nhung file tinh
app.use(
  express.urlencoded({
    extended: true,
  }),
); // middleware xu li cho req POST - qua html form
app.use(express.json()); // qua XMLHttpRequest, fetch, axios, ajax,... - qua thu vien khac
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
//       return next(); // qua func middleware tiep theo
//     }
//     res.status(403).json({
//       message: 'Request invalid',
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
