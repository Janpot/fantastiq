'use strict';

var Promise = require('bluebird');
var IntervalWorker = require('./IntervalWorker');
var util = require('util');

function Worker (queue, doWorkFn, options) {
  options = options || {};
  var pollTime = options.pollTime || 1000;
  IntervalWorker.call(this, this.fetchAndExecuteOne.bind(this), pollTime);
  this._queue = queue;
  this._pollTime = pollTime;
  this._random = !!options.random;
  this._doWorkFn = doWorkFn;
  this._unthrottleOnNextTick = false;
  this._lastId = null;
  this._result = null;
  this._stats = {
    completed: 0,
    failed: 0
  };
}
util.inherits(Worker, IntervalWorker);

Worker.prototype._executeWork = function (job) {
  return Promise.try(function () {
    return this._doWorkFn(job.data);
  }.bind(this))
    .bind(this)
    .then(function (result) {
      this._stats.completed += 1;
      return this._queue.acknowledge(job.id, null, result);
    }, function (error) {
      this._stats.failed += 1;
      return this._queue.acknowledge(job.id, error);
    });
};

Worker.prototype.fetchAndExecuteOne = function () {
  return this._queue.retrieve({
    unthrottle: this._unthrottleOnNextTick ? !!this.lastId : false,
    random: this._random
  })
    .bind(this)
    .then(function (result) {
      var wait = result.wait || 0;

      if (!result.id) {
        this._lastId = null;
        return wait;
      }

      this._lastId = result.id;
      var startTime = Date.now();
      return this._executeWork(result)
        .then(function () {
          var elapsedTime = Date.now() - startTime;
          return Math.max(wait - elapsedTime, 0);
        });
    })
    .catch(function () {
      return this._pollTime;
    })
    .then(function (pollTime) {
      this.setDelay(pollTime);
    });
};

Worker.prototype.unthrottle = function () {
  this._unthrottleOnNextTick = true;
  return this;
};

Worker.prototype.start = function () {
  return IntervalWorker.prototype.start.call(this).bind(this)
    .then(function () {
      return this._stats;
    });
};

Worker.prototype.stop = function () {
  return IntervalWorker.prototype.stop.call(this).bind(this)
    .then(function () {
      return this._stats;
    });
};

module.exports = Worker;
