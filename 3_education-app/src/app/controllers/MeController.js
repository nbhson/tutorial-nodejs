const Course = require('../models/Course');
const { multipleMongooseToObject } = require('../../util/mongoose');

class MeController {
  // [GET] /me/stored/courses/
  storedCourses(req, res, next) {
    Promise.all([Course.countDocumentsDeleted(), Course.find({})])
      .then((data) => {
        const deletedCount = data[0];
        const courses = data[1];

        res.render('me/stored-courses', {
          courses: multipleMongooseToObject(courses),
          deletedCount: deletedCount,
        });
      })
      .catch(next);
  }

  trashCourses(req, res, next) {
    Course.findDeleted()
      .then((courses) => {
        res.render('me/trash-courses', {
          courses: multipleMongooseToObject(courses),
        });
      })
      .catch(next);
  }
}

module.exports = new MeController();
