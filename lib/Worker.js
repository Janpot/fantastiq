'use strict';

var Promise = require('bluebird');

function Worker(queue, doWorkFn, options) {
  options = options || {};
  this._queue = queue;
  this._pollTime = options.pollTime || 1000;
  this._random = !!options.random;
  this._doWorkFn = doWorkFn;
  this._pendingWork = null;
  this._unthrottleOnNextTick = false;
}

Worker.prototype._executeWork = function (job) {
  return Promise.try(function () {
    return this._doWorkFn(job.data);
  }, null, this)
    .bind(this)
    .then(function (result) {
      return this._queue.acknowledge(job.id, null, result);
    }, function (error) {
      return this._queue.acknowledge(job.id, error);
    });
};

Worker.prototype.fetchAndExecuteOne = function (options) {
  return this._queue.retrieve(options)
    .bind(this)
    .then(function (result) {
      var wait = result.wait || 0;

      if (!result.id) {
        return wait;
      }
      var startTime = Date.now();
      return this._executeWork(result.data)
        .finally(function () {
          var elapsedTime = Date.now() - startTime;
          return Math.max(wait - elapsedTime, 0);
        });
    })
    .catch(function () {
      return this._pollTime;
    });
};

Worker.prototype._tick = function () {
  this._pendingWork = this.fetchAndExecuteOne({
    unthrottle: this._unthrottleOnNextTick,
    random: this._random
  });
  this._unthrottleOnNextTick = false;

  this._pendingWork
    .bind(this)
    .finally(function (waitTime) {
      this._pendingWork = null;

      if (!this._active) {
        return null;
      }

      this._timeout = setTimeout(function () {
        this._timeout = null;
        this._tick();
      }.bind(this), waitTime);
    });
};

Worker.prototype.isRunning = function () {
  return !!(this._pendingWork || this._timeout);
};

Worker.prototype.start = function () {
  this._active = true;
  this._unthrottleOnNextTick = false;
  if (!this.isRunning()) {
    this._tick();
  }
  return this;
};

Worker.prototype.unthrottle = function () {
  this._unthrottleOnNextTick = true;
  if (this._timeout) {
    clearTimeout(this._timeout);
    this._timeout = null;
    this._tick();
  }
  return null;
};

Worker.prototype.stop = function () {
  this._active = false;
  if (this._timeout) {
    clearTimeout(this._timeout);
    this._timeout = null;
  }
  return Promise.resolve(this._pendingWork).return(null);
};


module.exports = Worker;
