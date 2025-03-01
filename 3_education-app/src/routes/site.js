const express = require('express');
const siteController = require('../app/controllers/SiteController');

const router = express.Router();

router.get('/search', siteController.searchPage);
router.get('/', siteController.homePage);

module.exports = router;
