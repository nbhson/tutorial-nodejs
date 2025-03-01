const Course = require('../models/Course');

class CourseController {
  // [GET] /courses/:slug
  show(req, res, next) {
    Course.findOne({
      slug: req.params.slug,
    })
      .then((course) => res.render('course/show', course))
      .catch(next);
  }

  // [GET] /courses/create
  create(req, res, next) {
    res.render('course/create');
  }

  // [POST] /courses/store
  store(req, res, next) {
    const formData = req.body;
    formData.image = 'https://blog.nscsports.org/wp-content/uploads/2014/10/default-img.gif';
    const small = new Course(formData);
    small
      .save()
      .then(() => res.redirect('/'))
      .catch((error) => {});
  }

  // [GET] /courses/:id/edit
  async edit(req, res, next) {
    await Course.findById(req.params.id)
      .exec()
      .then((course) => res.render('course/edit', course))
      .catch(next);
  }

  // [PUT] /courses/:id
  update(req, res, next) {
    Course.findByIdAndUpdate(req.params.id, req.body)
      .then(() => res.redirect('/me/stored/courses'))
      .catch(next);
  }

  // [DELETE] /:id
  destroy(req, res, next) {
    Course.delete({
      _id: req.params.id,
    }) // Course.delete: soft delete
      .then(() => res.redirect('back'))
      .catch(next);
  }

  // [PATCH] /:id/restore
  restore(req, res, next) {
    Course.restore({
      _id: req.params.id,
    })
      .then(() => res.redirect('back'))
      .catch(next);
  }

  // [DELETE] /:id/delete
  delete(req, res, next) {
    Course.findOneAndDelete({
      _id: req.params.id,
    })
      .then(() => res.redirect('back'))
      .catch(next);
  }
}

module.exports = new CourseController();
