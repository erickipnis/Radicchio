require('babel-core/register');
import Redis from 'ioredis';

const fs = require('fs');
const redis = new Redis();

console.log('Radicchio started');

const luaCommand = fs.readFileSync(__dirname + '/lua/test.lua', 'utf8');

redis.defineCommand('print', {
  numberOfKeys: 0,
  lua: luaCommand,
});

redis.print('', function (err, result) {
  console.log(result);
});
