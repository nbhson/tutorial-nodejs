const express = require('express');
const courseController = require('../app/controllers/CourseController');

const router = express.Router();

router.get('/create', courseController.create);
router.post('/store', courseController.store);
router.get('/:id/edit', courseController.edit);
router.put('/update/:id', courseController.update);
router.delete('/:id', courseController.destroy);
router.patch('/:id/restore', courseController.restore);
router.delete('/:id/delete', courseController.delete);
router.get('/:slug', courseController.show);

module.exports = router;
