require('babel-core/register');
import Redis from 'ioredis';
import fs from 'fs';
import Promise from 'bluebird';
import _ from 'lodash';

const redis = new Redis();
const sub = new Redis();
const radicchio = {};

function loadLuaFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

radicchio.init = function () {
  const EVENT_DEL = '__keyevent@0__:del';

  return new Promise(function (resolve) {
    const startFile = loadLuaFile(__dirname + '/lua/start.lua');
    const disableFile = loadLuaFile(__dirname + '/lua/disable.lua');
    const getSetKeysFile = loadLuaFile(__dirname + '/lua/getSetKeys.lua');
    const getTimeLeftFile = loadLuaFile(__dirname + '/lua/getTimeLeft.lua');

    redis.config('SET', 'notify-keyspace-events', 'KEA');

    redis.defineCommand('startTimer', {
      numberOfKeys: 2,
      lua: startFile,
    });

    redis.defineCommand('disableTimer', {
      numberOfKeys: 2,
      lua: disableFile,
    });

    redis.defineCommand('getSetKeys', {
      numberOfKeys: 1,
      lua: getSetKeysFile,
    });

    redis.defineCommand('getTimeLeft', {
      numberOfKeys: 1,
      lua: getTimeLeftFile,
    });

    sub.on('message', function (channel, message) {
      // Replace with actual emit to event-emitter
      console.log('channel: ' + channel + ', message: ' + message);
    });

    sub.subscribe(EVENT_DEL);

    resolve(true);
  });
};

radicchio.startTimer = function (setId, fieldId, timeInMS) {
  return new Promise(function (resolve, reject) {
    try {
      redis.startTimer(setId, fieldId, timeInMS, '', function (err, result) {
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

radicchio.disableTimer = function (setId, fieldId) {
  return new Promise(function (resolve, reject) {
    try {
      redis.disableTimer(setId, fieldId, '', '', function (err, result) {
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

radicchio.getTimeLeft = function (key) {
  return new Promise(function (resolve, reject) {
    try {
      redis.getTimeLeft(key, '', function (err, result) {
        if (err) {
          reject(err);
        }
        else if (result >= 0) {
          resolve(result);
        }
        else if (result < 0) {
          reject('The timer with key ' + key + 'has expired or does not exist');
        }
      });
    }
    catch (e) {
      reject(e);
    }
  });
};

radicchio.getTimeLeftOnSetKeys = function (setId) {
  const promises = [];

  return new Promise(function (resolve, reject) {
    try {
      redis.getSetKeys(setId, '', function (err, result) {
        _.map(result, function (id) {
          promises.push(radicchio.getTimeLeft(id));
        });

        Promise.all(promises)
        .then(function (results) {
          resolve(results);
        });
      });
    }
    catch (e) {
      reject(e);
    }
  });
};

module.exports = radicchio;
