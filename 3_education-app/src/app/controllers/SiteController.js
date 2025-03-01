const { multipleMongooseToObject } = require('../../util/mongoose');
const Course = require('../models/Course');

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
      // .catch(error => next(err))
      .catch(next);
  }

  // [GET] /search
  searchPage(req, res) {
    res.render('search');
  }
}

module.exports = new SiteController();
