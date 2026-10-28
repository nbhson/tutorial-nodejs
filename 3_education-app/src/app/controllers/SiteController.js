import Course from '../models/Course.js';
import { multipleMongooseToObject } from '../../util/mongoose.js';

class SiteController {
  // [GET] /
  homePage(req, res, next) {
    /** Callback */
    // Course.find({}, (err, courses) => {
    //   if (!err) {
    //     res.json(courses)
    //     return
    //   }
    //   next(err)
    // })

    /** Promise */
    Course.find({})
      .then((courses) => {
        res.render('home', {
          title: 'Tất cả khóa học',
          courses: multipleMongooseToObject(courses),
        });
      })
      .catch(next);
  }

  // [GET] /search
  searchPage(req, res) {
    res.render('search');
  }
}

export default new SiteController();
