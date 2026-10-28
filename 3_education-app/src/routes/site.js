import express from 'express';
import siteController from '../app/controllers/SiteController.js';

const router = express.Router();

router.get('/search', siteController.searchPage);
router.get('/', siteController.homePage);

export default router;
