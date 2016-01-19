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
.then((timeLeft) => {
  // timeLeft contains the number of milliseconds left in the timer returned by the promise
});

radicchio.getAllTimesLeft()
.then((timesLeft) => {
  // timesLeft contains an array of objects each with a timerId and the respective amount of time left in milliseconds
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
