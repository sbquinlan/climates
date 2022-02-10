const serveStatic = require('serve-static');
const compression = require('compression');

module.exports = function (app) {
  app.use((_, res, next) => {
    res.setHeader('Cache-control', 'no-cache');
    next();
  });
  app.use('/tiles', compression({ filter: () => true }));
  app.use('/tiles', serveStatic('../data/webroot'));
}
