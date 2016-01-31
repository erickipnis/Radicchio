require('babel-core/register');

module.exports = function(redisUrl) {
  const redisURL = redisUrl || 'redis://localhost:6379'
  const radicchio = require('./dist/app.js')(redisURL);
  radicchio.init();

  return radicchio;
}
