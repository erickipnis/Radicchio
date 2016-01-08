require('babel-core/register');
import Redis from 'ioredis';
import fs from 'fs';
import Promise from 'bluebird';
import _ from 'lodash';

const redis = new Redis();
const radicchio = {};

function loadLuaFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

radicchio.init = function () {
  return new Promise(function (resolve) {
    const startFile = loadLuaFile(__dirname + '/lua/start.lua');
    const disableFile = loadLuaFile(__dirname + '/lua/disable.lua');
    const getTimeLeftFile = loadLuaFile(__dirname + '/lua/getTimeLeft.lua');

    redis.defineCommand('startTimer', {
      numberOfKeys: 1,
      lua: startFile,
    });

    redis.defineCommand('disableTimer', {
      numberOfKeys: 1,
      lua: disableFile,
    });

    redis.defineCommand('getTimeLeft', {
      numberOfKeys: 1,
      lua: getTimeLeftFile,
    });

    resolve(true);
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
  return new Promise(function (resolve, reject) {
    try {
      redis.disableTimer(id, '', function (err, result) {
        if (err) {
          reject(err);
        }
        else {
          resolve(result);
        }
      });
    }
    catch (e) {
      reject(e);
    }
  });
};

radicchio.getTimeLeft = function (id) {
  return new Promise(function (resolve, reject) {
    try {
      redis.getTimeLeft(id, '', function (err, result) {
        if (err) {
          reject(err);
        }
        else if (result >= 0) {
          resolve(result);
        }
        else if (result < 0) {
          reject('The timer with key ' + id + 'has expired or does not exist');
        }
      });
    }
    catch (e) {
      reject(e);
    }
  });
};

radicchio.getTimeLeftOnAllKeys = function (ids) {
  const promises = [];

  return new Promise(function (resolve, reject) {
    try {
      _.map(ids, function (id) {
        promises.push(radicchio.getTimeLeft(id));
      });

      Promise.all(promises)
      .then(function (results) {
        resolve(results);
      });
    }
    catch (e) {
      reject(e);
    }
  });
};

module.exports = radicchio;
