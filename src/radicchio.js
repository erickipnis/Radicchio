require('babel-core/register');
import Redis from 'ioredis';
import fs from 'fs';
import Promise from 'bluebird';

const redis = new Redis();
const radicchio = {};

function loadLuaFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

radicchio.init = function () {
  const startFile = loadLuaFile(__dirname + '/lua/start.lua');
  const disableFile = loadLuaFile(__dirname + '/lua/disable.lua');

  redis.defineCommand('startTimer', {
    numberOfKeys: 1,
    lua: startFile,
  });

  redis.defineCommand('disableTimer', {
    numberOfKeys: 1,
    lua: disableFile,
  });
};

radicchio.startTimer = function (id, timeInMS) {
  return new Promise(function (resolve, reject) {
    try {
      redis.startTimer(id, timeInMS, function (err, result) {
        if (err) {
          reject(err);
        }
        else if (result.toLowerCase() === 'ok') {
          resolve(true);
        }
      });
    }
    catch (e) {
      reject(e);
    }
  });
};

radicchio.disableTimer = function (id) {
  redis.disableTimer(id, '', function (err, result) {
    if (err) {
      throw new Error('Could not disable timer: ' + err);
    }

    console.log(result);
  });
};

module.exports = radicchio;
