import siteRouter from './site.js';
import courseRouter from './course.js';
import meRouter from './me.js';

function route(app) {
  app.use('/courses', courseRouter);
  app.use('/me', meRouter);
  app.use('/', siteRouter);
}

export default route;
