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

Worker.prototype.fetchAndExecuteOne = async function () {
  const unthrottle = this._unthrottleOnNextTick ? !!this._lastId : false;
  this._unthrottleOnNextTick = false;
  try {
    const result = await this._queue.retrieve({ unthrottle, random: this._random });

    var wait = result.wait || 0;

    this._lastId = result.id || null;

    if (!result.id) {
      this.setDelay(wait > 0 ? wait : this._pollTime);
      return;
    }

    const startTime = Date.now();

    await this._executeWork(result);

    if (this._unthrottleOnNextTick) {
      this.setDelay(0);
    } else {
      var elapsedTime = Date.now() - startTime;
      this.setDelay(Math.max(wait - elapsedTime, 0));
    }
  } catch (err) {
    this.setDelay(this._pollTime);
  }
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
