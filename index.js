require('babel-core/register');
const radicchio = require('./dist/app.js');

radicchio.init();

module.exports = radicchio;
