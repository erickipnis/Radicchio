'use strict';
require('source-map-support').install();

var _ioredis = require('ioredis');

var _ioredis2 = _interopRequireDefault(_ioredis);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

var _eventEmitter = require('event-emitter');

var _eventEmitter2 = _interopRequireDefault(_eventEmitter);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Radicchio imports
require('babel-core/register');

// Radicchio constants
var redis = new _ioredis2.default();
var sub = new _ioredis2.default();
var emitter = (0, _eventEmitter2.default)({});
var radicchio = {};
var setSuffix = '-set';
var suspendedSuffix = '-suspended';
var resumedSuffix = '-resumed';

/**
* Loads a lua file
* @param {String} fileName - the lua file name to load from the lua folder
* @returns {String} - the loaded file contents
*/
function loadLuaFile(fileName) {
  var luaDirectory = __dirname + '/../src/lua/';
  return _fs2.default.readFileSync(luaDirectory + fileName, 'utf8');
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
  var EVENT_DELETED = '__keyevent@0__:del';
  var EVENT_EXPIRED = '__keyevent@0__:expired';
  var EVENT_EXPIRE = '__keyevent@0__:expire';

  radicchio.setId = _shortid2.default.generate() + setSuffix;

  return new _bluebird2.default(function (resolve) {
    // Load lua files
    var startFile = loadLuaFile('start.lua');
    var deleteFile = loadLuaFile('delete.lua');
    var getSetKeysFile = loadLuaFile('getSetKeys.lua');
    var getTimeLeftFile = loadLuaFile('getTimeLeft.lua');
    var suspendFile = loadLuaFile('suspend.lua');
    var resumeFile = loadLuaFile('resume.lua');

    // Redis Pub/Sub config settings
    redis.config('SET', 'notify-keyspace-events', 'KEA');

    // Redis custom defined commands
    redis.defineCommand('startTimer', {
      numberOfKeys: 2,
      lua: startFile
    });

    redis.defineCommand('deleteTimer', {
      numberOfKeys: 1,
      lua: deleteFile
    });

    redis.defineCommand('getSetKeys', {
      numberOfKeys: 1,
      lua: getSetKeysFile
    });

    redis.defineCommand('getTimeLeft', {
      numberOfKeys: 1,
      lua: getTimeLeftFile
    });

    redis.defineCommand('suspendTimer', {
      numberOfKeys: 2,
      lua: suspendFile
    });

    redis.defineCommand('resumeTimer', {
      numberOfKeys: 2,
      lua: resumeFile
    });

    // Event handler for Redis Pub/Sub events with the subscribing Redis client
    sub.on('message', function (channel, message) {
      if (channel === EVENT_DELETED) {
        if (message.indexOf(suspendedSuffix) >= 0) {
          emitter.emit('suspended', message);
        } else if (message.indexOf(setSuffix) === -1) {
          emitter.emit('deleted', message);
        } else if (message.indexOf(setSuffix) >= 0) {
          radicchio.setId = _shortid2.default.generate() + setSuffix;
        }
      } else if (channel === EVENT_EXPIRED && message.indexOf(setSuffix) === -1) {
        emitter.emit('expired', message);
      } else if (channel === EVENT_EXPIRE && message.indexOf(resumedSuffix) >= 0) {
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
  return new _bluebird2.default(function (resolve, reject) {
    try {
      (function () {
        var timerId = _shortid2.default.generate();

        redis.startTimer(radicchio.setId, timerId, timeInMS, '', function (err, result) {
          if (err) {
            reject(err);
          } else if (result.toLowerCase() === 'ok') {
            resolve(timerId);
          }
        });
      })();
    } catch (e) {
      reject(e);
    }
  });
};

/**
* Suspends a timer by updating the TTL in the global Redis set and deleting the timer
* @param {String} timerId - The timer id to be suspended
* @returns {Promise<Boolean|Error>} - Resolves to true if suspended successfully
*/
radicchio.suspendTimer = function (timerId) {
  return new _bluebird2.default(function (resolve, reject) {
    try {
      redis.suspendTimer(radicchio.setId, timerId, timerId + suspendedSuffix, '', function (err, result) {
        if (err) {
          reject(err);
        } else if (result === 1) {
          resolve(true);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
};

/**
* Starts a new timer with the remaining TTL pulled from the global Redis set
* @param {String} timerId - The timer id to be resumed
* @returns {Promise<Boolean|Error>} - Resolves to true if resumed successfully
*/
radicchio.resumeTimer = function (timerId) {
  return new _bluebird2.default(function (resolve, reject) {
    try {
      redis.resumeTimer(radicchio.setId, timerId, timerId + resumedSuffix, '', function (err, result) {
        if (err) {
          reject(err);
        } else if (result.toLowerCase() === 'ok') {
          resolve(true);
        }
      });
    } catch (e) {
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
  return new _bluebird2.default(function (resolve, reject) {
    try {
      redis.deleteTimer(radicchio.setId, timerId, function (err, result) {
        if (err) {
          reject(err);
        } else if (result === 1) {
          resolve(true);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
};

/**
* Gets the TTL (time to live) on a timer in Redis
* @param {String} timerId - The timer id get the time left on
* @returns {Promise<{String, Number}|Error>} - Resolves to an object with the timer id and left in milliseconds
*/
radicchio.getTimeLeft = function (timerId) {
  return new _bluebird2.default(function (resolve, reject) {
    try {
      redis.getTimeLeft(timerId, '', function (err, timeLeft) {
        if (err) {
          reject(err);
        } else if (timeLeft >= 0) {
          var timerObj = {
            timerId: timerId,
            timeLeft: timeLeft
          };
          resolve(timerObj);
        } else if (timeLeft < 0) {
          resolve(null);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
};

/**
* Gets the TTL (time to live) on all timers in the global Redis set
* Filters out any timers that have no time left or have expired
* @returns {Promise<Array<{String, Number}>|Error>} - Resolves to an array of objects with a timer id and time left in milliseconds
*/
radicchio.getAllTimesLeft = function () {
  var promises = [];

  return new _bluebird2.default(function (resolve, reject) {
    try {
      redis.getSetKeys(radicchio.setId, '', function (err, result) {
        _lodash2.default.map(result, function (timerId) {
          promises.push(radicchio.getTimeLeft(timerId));
        });

        _bluebird2.default.all(promises).then(function (timerObjs) {
          var filtered = _lodash2.default.filter(timerObjs, function (timerObj) {
            return timerObj !== null && timerObj.timeLeft > 0;
          });

          resolve(filtered);
        });
      });
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = radicchio;
//# sourceMappingURL=app.js.map
