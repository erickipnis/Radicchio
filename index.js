require('babel-core/register');
const radicchio = require('./src/radicchio');

radicchio.init();

radicchio.startTimer('abc123', '10000')
.then(function(result, err) {
  if (err) {
    throw new Error('Failed to start timer: ' + err);
  }

  console.log(result);
  radicchio.disableTimer('abc123');
})
.catch(function(err) {
  throw err;
});
