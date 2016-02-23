// Radicchio imports
require('babel-core/register');
import Redis from 'ioredis';
import fs from 'fs';
import Promise from 'bluebird';
import uuid from 'node-uuid';
import eventEmitter from 'event-emitter';
import _ from 'lodash';

module.exports = function (redisUrl) {
  // Radicchio constants

  const redisURL = redisUrl || 'redis://localhost:6379';
  const redis = new Redis(redisURL);
  const sub = new Redis(redisURL);
  const emitter = eventEmitter({});
  const radicchio = {};
  const setTTLSuffix = '-ttl-set';
  const setDataSuffix = '-data-set';
  const suspendedSuffix = '-suspended';
  const resumedSuffix = '-resumed';

  /**
  * Loads a lua file
  * @param {String} fileName - the lua file name to load from the lua folder
  * @returns {String} - the loaded file contents
  */
  function loadLuaFile(fileName) {
    const luaDirectory = __dirname + '/../src/lua/';
    return fs.readFileSync(luaDirectory + fileName, 'utf8');
  }

  /**
  * Update loop that runs once a second and targets redis keys to ensure expiration
  */
  function update() {
    radicchio.getAllTimesLeft();
    radicchio.getDataFromAllTimers();
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

    radicchio.globalSetId = uuid.v4();

    radicchio.timerSetId = radicchio.globalSetId + setTTLSuffix;
    radicchio.dataSetId = radicchio.globalSetId + setDataSuffix;

    return new Promise(function (resolve) {
      // Load lua files
      const startFile = loadLuaFile('start.lua');
      const deleteFile = loadLuaFile('delete.lua');
      const getSetKeysFile = loadLuaFile('getSetKeys.lua');
      const getTimeLeftFile = loadLuaFile('getTimeLeft.lua');
      const suspendFile = loadLuaFile('suspend.lua');
      const resumeFile = loadLuaFile('resume.lua');
      const getDataFile = loadLuaFile('getTimerData.lua');
      const deleteFromSetsFile = loadLuaFile('deleteFromSets.lua');

      // Redis Pub/Sub config settings
      redis.config('SET', 'notify-keyspace-events', 'KEA');

      // Redis custom defined commands
      redis.defineCommand('startTimer', {
        numberOfKeys: 3,
        lua: startFile,
      });

      redis.defineCommand('deleteTimer', {
        numberOfKeys: 2,
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

      redis.defineCommand('getTimerData', {
        numberOfKeys: 1,
        lua: getDataFile,
      });

      redis.defineCommand('deleteFromSets', {
        numberOfKeys: 2,
        lua: deleteFromSetsFile,
      });

      // Event handler for Redis Pub/Sub events with the subscribing Redis client
      sub.on('message', function (channel, message) {
        if (channel === EVENT_DELETED) {
          if (message.indexOf(suspendedSuffix) >= 0) {
            emitter.emit('suspended', message);
          }
          else if (message.indexOf(setDataSuffix) >= 0) {
            radicchio.dataSetId = null;
          }
          else if (message.indexOf(setTTLSuffix) >= 0) {
            radicchio.timerSetId = null;
          }
          else if (message.indexOf(setTTLSuffix) === -1) {
            emitter.emit('deleted', message);
          }

          if (radicchio.timerSetId === null && radicchio.dataSetId === null) {
            radicchio.globalSetId = uuid.v4();
            radicchio.timerSetId = radicchio.globalSetId + setTTLSuffix;
            radicchio.dataSetId = radicchio.globalSetId + setDataSuffix;
          }
        }
        else if (channel === EVENT_EXPIRED && message.indexOf(setTTLSuffix) === -1) {
          redis.deleteFromSets(radicchio.timerSetId, radicchio.dataSetId, message, function () {});

          radicchio.getTimerData(message)
          .then((timerObj) => {
            emitter.emit('expired', timerObj);
          });
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
  * Generates an id for a set and a timer using RFC4122 UUIDS
  * Tracks the timer key in a Redis set and starts an expire on the timer key
  * @param {String} timeInMS - The timer length in milliseconds
  * @param {Object} data - data object to be associated with the timer
  * @returns {Promise<String|Error>} - Resolves to the started timer id
  */
  radicchio.startTimer = function (timeInMS, data) {
    const dataObj = data || {};

    return new Promise(function (resolve, reject) {
      try {
        const timerId = uuid.v4();
        const dataStringified = JSON.stringify(dataObj);

        redis.startTimer(radicchio.timerSetId, timerId, radicchio.dataSetId, timeInMS, dataStringified, '', function (err, result) {
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
  * @returns {Promise<Boolean|Error>} - Resolves to true if suspended successfully
  */
  radicchio.suspendTimer = function (timerId) {
    return new Promise(function (resolve, reject) {
      try {
        redis.suspendTimer(radicchio.timerSetId, timerId, timerId + suspendedSuffix, '', function (err, result) {
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
  * Starts a new timer with the remaining TTL in milliseconds pulled from the global Redis set
  * @param {String} timerId - The timer id to be resumed
  * @returns {Promise<Boolean|Error>} - Resolves to true if resumed successfully
  */
  radicchio.resumeTimer = function (timerId) {
    return new Promise(function (resolve, reject) {
      try {
        redis.resumeTimer(radicchio.timerSetId, timerId, timerId + resumedSuffix, '', function (err, result) {
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

  /**
  * Deletes a timer from Redis and the global Redis set
  * @param {String} timerId - The timer id to be deleted
  * @returns {Promise<Object|Error>} - Resolves to an object containing associated timer data
  */
  radicchio.deleteTimer = function (timerId) {
    return new Promise(function (resolve, reject) {
      try {
        redis.deleteTimer(radicchio.timerSetId, radicchio.dataSetId, timerId, '', function (err, result) {
          if (err) {
            reject(err);
          }
          else if (result !== 'nil') {
            const data = JSON.parse(result);
            resolve(data);
          }
          else {
            reject(null);
          }
        });
      }
      catch (e) {
        reject(e);
      }
    });
  };

  /**
  * Gets the TTL (time to live) in milliseconds on a timer in Redis
  * @param {String} timerId - The timer id get the time left on
  * @returns {Promise<Object(String, Number)|Error>} - Resolves to an object with the timer id and time left
  */
  radicchio.getTimeLeft = function (timerId) {
    return new Promise(function (resolve, reject) {
      try {
        redis.getTimeLeft(timerId, '', function (err, timeLeft) {
          if (err) {
            reject(err);
          }
          else if (timeLeft >= 0) {
            const timerObj = {
              timerId,
              timeLeft,
            };
            resolve(timerObj);
          }
          else if (timeLeft < 0) {
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
  * Gets the TTL (time to live) in milliseconds on all timers in the global Redis set
  * Filters out any timers that have no time left or have expired
  * @returns {Promise<Array(Object(String, Number))}>|Error>} - Resolves to an array of objects with a timer id and time left
  */
  radicchio.getAllTimesLeft = function () {
    const promises = [];

    return new Promise(function (resolve, reject) {
      try {
        redis.getSetKeys(radicchio.timerSetId, '', function (err, result) {
          if (err) {
            reject(err);
          }
          else {
            _.map(result, function (timerId) {
              promises.push(radicchio.getTimeLeft(timerId));
            });

            Promise.all(promises)
            .then((timerObjs) => {
              const filtered = _.filter(timerObjs, function (timerObj) {
                return timerObj !== null && timerObj.timeLeft > 0;
              });

              resolve(filtered);
            });
          }
        });
      }
      catch (e) {
        reject(e);
      }
    });
  };

  /**
  * Gets the data associated with a timer
  * @param {String} timerId - The timer id to get the associated data for
  * @returns {Promise<Object(String, Object)|Error>} - Resolves to an object with the timer id and associated timer data
  */
  radicchio.getTimerData = function (timerId) {
    return new Promise(function (resolve, reject) {
      try {
        redis.getTimerData(radicchio.dataSetId, timerId, function (err, result) {
          if (err) {
            reject(err);
          }
          else {
            if (result === 'nil') {
              reject(null);
            }
            else {
              const data = JSON.parse(result);
              const timerObj = {
                timerId,
                data,
              };

              resolve(timerObj);
            }
          }
        });
      }
      catch (e) {
        reject(e);
      }
    });
  };

  /**
  * Get the data from all active timers (including suspended timers)
  * @returns {Promise<Array<Object(String, Object)>|Error>} - Resolves to an array of objects with a timer id and data object
  */
  radicchio.getDataFromAllTimers = function () {
    const promises = [];

    return new Promise(function (resolve, reject) {
      try {
        redis.getSetKeys(radicchio.dataSetId, '', function (err, result) {
          if (err) {
            reject(err);
          }
          else {
            _.map(result, function (timerId) {
              promises.push(radicchio.getTimerData(timerId));
            });

            Promise.all(promises)
            .then((timerDataObjs) => {
              resolve(timerDataObjs);
            });
          }
        });
      }
      catch (e) {
        reject(e);
      }
    });
  };

  return radicchio;
};
