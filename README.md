# Radicchio
A distributed timer written with ES6 syntax and implemented with Redis and Lua scripts.

## Installation
```
$ npm install radicchio
```

## Requirements
Requires Redis version 2.8.0 or later (uses keyspace notifications)

## Features
- Timers stored in a Redis set to speed up looking through all of the timers
- Lua scripts provide efficiency and speed for Redis calls
- Promises for timer functions
- Starting a new timer with a specified expiration time (in milliseconds)
- Suspending and Resuming a timer
- Deleting a timer
- Listening for a specific type of timer event

## Types of Events
- expired: triggers when a timer expires in Redis
- deleted: triggers when a timer is removed from Redis
- suspended: triggers when a timer is removed from Redis and stored in the global set with the time left
- resumed: triggers when a suspended timer is taken from the global set and set to expire with the remaining time left

### API
#### startTimer(timeInMS) - start a timer with an expiration time
- @param {String} timeInMS - The timer length in milliseconds
- @returns {Promise<(String|Error)>} - Resolves to the started timer id

#### deleteTimer(timerId) - delete a timer
- @param {String} timerId - The timer id to be deleted
- @returns {Promise<(Boolean|Error)>} - Resolves to true if deleted successfully

#### suspendTimer(timerId) - suspend a timer
- @param {String} timerId - The timer id to be suspended
- @returns {Promise<(Boolean|Error)>} - Resolves to true if suspended successfully

#### resumeTimer(timerId) - resume a timer
- @param {String} timerId - The timer id to be resumed
- @returns {Promise<(Boolean|Error)>} - Resolves to true if resumed successfully

#### getTimeLeft(timerId) - get the time left on a timer
- @param {String} timerId - The timer id get the time left on
- @returns {Promise<(Object(String, Number))|Error>} - Resolves to an object with the timer id and time left in milliseconds

#### getAllTimesLeft() - gets all of the times left on all timers (including suspended)
- @returns {Promise<(Array(Object(String, Number)))|Error>} - Resolves to array of objects with timer id and time left

#### on(event, callback) - sets up event listener for timer events
- @param {String} event - the supported event name to listen for
- @param {Function} - the callback function passed to event-emitter

### Example Usage
```
const radicchio = require('radicchio');

radicchio.startTimer('10000')
.then((timerId) => {
  // Keep track of the timerId returned by the promise to use with the other radicchio functions
});

radicchio.deleteTimer(timerId)
.then((success) => {
  // success will be a boolean returned by the promise
});

radicchio.suspendTimer(timerId)
.then((success) => {
  // success will be a boolean returned by the promise
});

radicchio.resumeTimer(timerId)
.then((success) => {
  // success will be a boolean returned by the promise
});

radicchio.getTimeLeft(timerId)
.then((timerObj) => {
  // timerObj contains an object with the timerId and timeLeft (in milliseconds)
});

radicchio.getAllTimesLeft()
.then((timerObjs) => {
  // timerObjs contains an array of objects each with a timerId and timeLeft in milliseconds
});

radicchio.on('expired', function(expiredTimerId) {
  // expiredTimerId contains the timerId of the timer that expired
});

radicchio.on('deleted', function(deletedTimerId) {
  // deletedTimerId contains the timerId of the timer that was deleted
});

radicchio.on('suspended', function(suspendedTimerId) {
  // suspendedTimerId contains the timerId of the timer that was suspended
});

radicchio.on('resumed', function(resumedTimerId) {
  // resumedTimerId contains the timerId of the timer that was resumed
});
```
