// Radicchio imports
require('babel-core/register');
import Redis from 'ioredis';
import fs from 'fs';
import Promise from 'bluebird';
import ShortId from 'shortid';
import eventEmitter from 'event-emitter';
import _ from 'lodash';

// Radicchio constants
const redis = new Redis();
const sub = new Redis();
const emitter = eventEmitter({});
const radicchio = {};
const setSuffix = '-set';
const suspendedSuffix = '-suspended';
const resumedSuffix = '-resumed';
radicchio.setId = null;

/**
* Loads a lua file
* @param {String} filePath - the file path to load
* @returns {String} - the loaded file contents
*/
function loadLuaFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

/**
* Update loop that runs once a second and targets redis keys to ensure expiration
*/
function update() {
  radicchio.getAllTimesLeft();
}

/**
* Sets up event-emitter events to react to Redis Pub/Sub
* Current supported internal events: deleted, expired, suspended, and resumed
* @param {String} event - the supported event name to listen for
* @param {Function} - the callback function passed to event-emitter
*/
radicchio.on = function (event, callback) {
  emitter.on(event, callback);
};

/**
* Setup initial synchronous settings, events, commands, and files for Radicchio
* @returns {Promise<Boolean>} - Resolves to true when initialized
*/
radicchio.init = function () {
  const EVENT_DELETED = '__keyevent@0__:del';
  const EVENT_EXPIRED = '__keyevent@0__:expired';
  const EVENT_EXPIRE = '__keyevent@0__:expire';

  return new Promise(function (resolve) {
    // Load lua files
    const startFile = loadLuaFile(__dirname + '/lua/start.lua');
    const deleteFile = loadLuaFile(__dirname + '/lua/delete.lua');
    const getSetKeysFile = loadLuaFile(__dirname + '/lua/getSetKeys.lua');
    const getTimeLeftFile = loadLuaFile(__dirname + '/lua/getTimeLeft.lua');
    const suspendFile = loadLuaFile(__dirname + '/lua/suspend.lua');
    const resumeFile = loadLuaFile(__dirname + '/lua/resume.lua');

    radicchio.setId = ShortId.generate() + setSuffix;

    // Redis Pub/Sub config settings
    redis.config('SET', 'notify-keyspace-events', 'KEA');

    // Redis custom defined commands
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
      numberOfKeys: 2,
      lua: suspendFile,
    });

    redis.defineCommand('resumeTimer', {
      numberOfKeys: 2,
      lua: resumeFile,
    });

    // Event handler for Redis Pub/Sub events with the subscribing Redis client
    sub.on('message', function (channel, message) {
      if (channel === EVENT_DELETED) {
        if (message.indexOf(suspendedSuffix) >= 0) {
          emitter.emit('suspended', message);
        }
        else {
          emitter.emit('deleted', message);
        }
      }
      else if (channel === EVENT_EXPIRED && message.indexOf(setSuffix) === -1) {
        emitter.emit('expired', message);
      }
      else if (channel === EVENT_EXPIRE && message.indexOf(resumedSuffix) >= 0) {
        emitter.emit('resumed', message);
      }
    });

    // Subscribe to the Redis Pub/Sub events with the subscribing Redis client
    sub.subscribe(EVENT_DELETED, EVENT_EXPIRED, EVENT_EXPIRE);

    // Setup the update function
    setInterval(update, 1000);

    resolve(true);
  });
};

/**
* Generates an id for a set and a timer using shortid
* Tracks the timer key in a Redis set and starts an expire on the timer key
* @param {String} timeInMS - The timer length in milliseconds
* @returns {Promise<String|Error>} - Resolves to the started timer id
*/
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

/**
* Suspends a timer by updating the TTL in the global Redis set and deleting the timer
* @param {String} timerId - The timer id to be suspended
* @returns {Promise<String|Error>} - Resolves to the suspended timer id
*/
radicchio.suspendTimer = function (timerId) {
  return new Promise(function (resolve, reject) {
    try {
      redis.suspendTimer(radicchio.setId, timerId, timerId + suspendedSuffix, function (err, result) {
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

/**
* Starts a new timer with the remaining TTL pulled from the global Redis set
* @param {String} timerId - The timer id to be resumed
* @returns {Promise<String|Error>} - Resolves to the resumed timer id
*/
radicchio.resumeTimer = function (timerId) {
  return new Promise(function (resolve, reject) {
    try {
      redis.resumeTimer(radicchio.setId, timerId, timerId + resumedSuffix, '', function (err, result) {
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

/**
* Deletes a timer from Redis and the global Redis set
* @param {String} timerId - The timer id to be deleted
* @returns {Promise<Boolean|Error>} - Resolves to true if deleted successfully
*/
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

/**
* Gets the TTL (time to live) on a timer in Redis
* @param {String} timerId - The timer id get the time left on
* @returns {Promise<Number|Error>} - Resolves to the time left in milliseconds
*/
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

/**
* Gets the TTL (time to live) on all timers in the global Redis set
* Filters out any timers that have no time left or have expired
* @returns {Promise<Array<Number>|Error>} - Resolves to an array of times left in milliseconds
*/
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
