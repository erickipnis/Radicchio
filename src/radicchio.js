require('babel-core/register');
import Redis from 'ioredis';
import fs from 'fs';
import Promise from 'bluebird';
import ShortId from 'shortid';
import eventEmitter from 'event-emitter';
import _ from 'lodash';

const redis = new Redis();
const sub = new Redis();
const emitter = eventEmitter({});
const radicchio = {};
const setSuffix = '-set';
radicchio.setId = null;

function loadLuaFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function update() {
  radicchio.getAllTimesLeft();
}

radicchio.on = function (event, callback) {
  emitter.on(event, callback);
};

radicchio.init = function () {
  const EVENT_DEL = '__keyevent@0__:del';
  const EVENT_EXPIRED = '__keyevent@0__:expired';

  return new Promise(function (resolve) {
    const startFile = loadLuaFile(__dirname + '/lua/start.lua');
    const deleteFile = loadLuaFile(__dirname + '/lua/delete.lua');
    const getSetKeysFile = loadLuaFile(__dirname + '/lua/getSetKeys.lua');
    const getTimeLeftFile = loadLuaFile(__dirname + '/lua/getTimeLeft.lua');
    const suspendFile = loadLuaFile(__dirname + '/lua/suspend.lua');
    const resumeFile = loadLuaFile(__dirname + '/lua/resume.lua');

    radicchio.setId = ShortId.generate() + setSuffix;
    redis.config('SET', 'notify-keyspace-events', 'KEA');

    redis.defineCommand('startTimer', {
      numberOfKeys: 2,
      lua: startFile,
    });

    redis.defineCommand('deleteTimer', {
      numberOfKeys: 1,
      lua: deleteFile,
    });

    redis.defineCommand('getSetKeys', {
      numberOfKeys: 1,
      lua: getSetKeysFile,
    });

    redis.defineCommand('getTimeLeft', {
      numberOfKeys: 1,
      lua: getTimeLeftFile,
    });

    redis.defineCommand('suspendTimer', {
      numberOfKeys: 1,
      lua: suspendFile,
    });

    redis.defineCommand('resumeTimer', {
      numberOfKeys: 1,
      lua: resumeFile,
    });

    sub.on('message', function (channel, message) {
      if (channel === EVENT_DEL && message.indexOf(setSuffix) === -1) {
        emitter.emit('del', message);
      }
      else if (channel === EVENT_EXPIRED && message.indexOf(setSuffix) === -1) {
        emitter.emit('expired', message);
      }
    });

    sub.subscribe(EVENT_DEL, EVENT_EXPIRED);

    setInterval(update, 1000);

    resolve(true);
  });
};

radicchio.startTimer = function (timeInMS) {
  return new Promise(function (resolve, reject) {
    try {
      if (radicchio.setId === null) {
        radicchio.setId = ShortId.generate() + setSuffix;
      }

      const timerId = ShortId.generate();

      redis.startTimer(radicchio.setId, timerId, timeInMS, '', function (err, result) {
        if (err) {
          reject(err);
        }
        else if (result.toLowerCase() === 'ok') {
          resolve(timerId);
        }
      });
    }
    catch (e) {
      reject(e);
    }
  });
};

radicchio.suspendTimer = function (timerId) {
  return new Promise(function (resolve, reject) {
    try {
      redis.suspendTimer(radicchio.setId, timerId, function (err, result) {
        if (err) {
          reject(err);
        }
        else if (result === 1) {
          resolve(timerId);
        }
      });
    }
    catch (e) {
      reject(e);
    }
  });
};

radicchio.resumeTimer = function (timerId) {
  return new Promise(function (resolve, reject) {
    try {
      redis.resumeTimer(radicchio.setId, timerId, function (err, result) {
        if (err) {
          reject(err);
        }
        else if (result.toLowerCase() === 'ok') {
          resolve(timerId);
        }
      });
    }
    catch (e) {
      reject(e);
    }
  });
};

radicchio.deleteTimer = function (timerId) {
  return new Promise(function (resolve, reject) {
    try {
      redis.deleteTimer(radicchio.setId, timerId, function (err, result) {
        if (err) {
          reject(err);
        }
        else if (result === 1) {
          resolve(true);
        }
      });
    }
    catch (e) {
      reject(e);
    }
  });
};

radicchio.getTimeLeft = function (timerId) {
  return new Promise(function (resolve, reject) {
    try {
      redis.getTimeLeft(timerId, '', function (err, result) {
        if (err) {
          reject(err);
        }
        else if (result >= 0) {
          resolve(result);
        }
        else if (result < 0) {
          resolve(null);
        }
      });
    }
    catch (e) {
      reject(e);
    }
  });
};

radicchio.getAllTimesLeft = function () {
  const promises = [];

  return new Promise(function (resolve, reject) {
    try {
      redis.getSetKeys(radicchio.setId, '', function (err, result) {
        _.map(result, function (timerId) {
          promises.push(radicchio.getTimeLeft(timerId));
        });

        Promise.all(promises)
        .then(function (timesLeft) {
          const filtered = _.filter(timesLeft, function (timeLeft) {
            return timeLeft > 0 || timeLeft !== null;
          });

          if (filtered.length === 0) {
            radicchio.setId = null;
          }
          resolve(filtered);
        });
      });
    }
    catch (e) {
      reject(e);
    }
  });
};

module.exports = radicchio;
