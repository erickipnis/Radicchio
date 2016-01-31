# Radicchio - Version 1.1.0
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
- Attach data to a new timer upon start by passing it an object
- Suspending and Resuming a timer
- Deleting a timer
- Listening for a specific type of timer event
- Get the time remaining or data attached to an active timer
- Get an array containing all of the active and suspended timers containing their data or time left

## Types of Events
- 'expired': triggers when a timer expires in Redis
- 'deleted': triggers when a timer is removed from Redis
- 'suspended': triggers when a timer is removed from Redis and stored in the global set with the time left
- 'resumed': triggers when a suspended timer is taken from the global set and set to expire with the remaining time left

### API
#### startTimer(timeInMS, data) - Start a timer with an expiration time and associated data
- @param {String} timeInMS - The timer length in milliseconds
- @param {Object} data - data object to be associated with the timer (empty object assigned by default)
- @returns {Promise<(String|Error)>} - Resolves to the started timer id

#### deleteTimer(timerId) - Delete a timer
- @param {String} timerId - The timer id to be deleted
- @returns {Promise<(Object|Error)>} - Resolves to an object containing associated timer data

#### suspendTimer(timerId) - Suspend a timer
- @param {String} timerId - The timer id to be suspended
- @returns {Promise<(Boolean|Error)>} - Resolves to true if suspended successfully

#### resumeTimer(timerId) - Resume a timer
- @param {String} timerId - The timer id to be resumed
- @returns {Promise<(Boolean|Error)>} - Resolves to true if resumed successfully

#### getTimeLeft(timerId) - Get the time left on a timer
- @param {String} timerId - The timer id get the time left on
- @returns {Promise<(Object(String, Number))|Error>} - Resolves to an object with the timer id and time left in milliseconds

#### getAllTimesLeft() - Gets all of the times left on all timers (including suspended)
- @returns {Promise<(Array(Object(String, Number)))|Error>} - Resolves to array of objects with a timer id and time left

#### on(event, callback) - Sets up event listener for timer events
- @param {String} event - the supported event name to listen for
- @param {Function} - the callback function passed to event-emitter

#### getTimerData(timerId) - Gets the data associated with a timer
- @param {String} timerId - The timer id to get the associated data for
- @returns {Promise<(Object)|Error>} - Resolves to an object with the associated timer data

#### getDataFromAllTimers() - Get the data from all active timers (including suspended timers)
- @returns {Promise<(Array<(Object(String, Object)))>|Error>} - Resolves to an array of objects with a timer id and data object

### Example Usage
```
const radicchio = require('radicchio')(); // Default. Have Redis listen on port 6379
const radicchio = require('radicchio')(6380); Have Redis listen on port 6380
const radicchio = require('radicchio')('redis://localhost:6379'); // Have Redis listen on a Redis URL

radicchio.startTimer('10000', {name: 'radicchio'})
.then((timerId) => {
  // Keep track of the timerId returned by the promise to use with the other radicchio functions
});

radicchio.deleteTimer(timerId)
.then((timerDataObj) => {
  // timerDataObj contains an object with the following properties:
  // .data - the associated data object
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
  // timerObj contains an object with the following properties:
  // .timerId - the timer id
  // .timeLeft - the time left in milliseconds
});

radicchio.getAllTimesLeft()
.then((timerObjs) => {
  // timerObjs contains an array of objects each with the following properties:
  // .timerId - the timer id
  // .timeLeft - the time left in milliseconds
});

radicchio.on('expired', function(expiredTimerObj) {
  // expiredTimerObj contains an object with the following properties:
  // .timerId - the timer id
  // .data - the associated data object
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

radicchio.getTimerData(timerId)
.then((timerDataObj) => {
  // timerDataObj contains an object with the following properties:
  // .timerId - the timer id
  // .data - the associated data object
});

radicchio.getDataFromAllTimers()
.then((timerDataObjs) => {
  // timerDataObjs contains an array of objects each with the following properties:
  // .timerId - the timer id
  // .data - the associated data object
});
```
