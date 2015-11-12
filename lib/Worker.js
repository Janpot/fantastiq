'use strict';

var Promise = require('bluebird');

function deferred() {
  var resolve;
  var reject;
  var promise = new Promise(function (_resolve, _reject) {
    resolve = _resolve;
    reject = _reject;
  });
  function track(toTrack) {
    toTrack.then(resolve, reject);
    return promise;
  }
  return {
    promise: promise,
    track: track
  };
}

function Worker(queue, doWorkFn, options) {
  options = options || {};
  this._queue = queue;
  this._pollTime = options.pollTime || 1000;
  this._random = !!options.random;
  this._doWorkFn = doWorkFn;
  this._pendingWork = null;
  this._unthrottleOnNextTick = false;
  this._lastId = null;
  this._jobsCompleted = 0;
  this._jobsFailed = 0;
  this._result = null;
}

Worker.prototype._executeWork = function (job) {
  return Promise.try(function () {
    return this._doWorkFn(job.data);
  }.bind(this))
    .bind(this)
    .then(function (result) {
      this._jobsCompleted += 1;
      return this._queue.acknowledge(job.id, null, result);
    }, function (error) {
      this._jobsFailed += 1;
      return this._queue.acknowledge(job.id, error);
    });
};

Worker.prototype.fetchAndExecuteOne = function (options) {
  return this._queue.retrieve(options)
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
    });
};

Worker.prototype._tick = function () {
  this._pendingWork = this.fetchAndExecuteOne({
    unthrottle: this._unthrottleOnNextTick && this.lastId || false,
    random: this._random
  });
  this._unthrottleOnNextTick = false;

  this._pendingWork
    .bind(this)
    .then(function (waitTime) {
      if (!waitTime && !this._lastId) {
        waitTime = this._pollTime;
      }

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
    this._result = deferred();
    this._tick();
  }
  return this._result.promise;
};

Worker.prototype.unthrottle = function () {
  this._unthrottleOnNextTick = true;
  if (this._timeout) {
    clearTimeout(this._timeout);
    this._timeout = null;
    this._tick();
  }
  return this;
};

Worker.prototype.stop = function () {
  this._active = false;
  if (this._timeout) {
    clearTimeout(this._timeout);
    this._timeout = null;
  }
  var result = Promise.resolve(this._pendingWork)
    .bind(this)
    .then(function () {
      return {
        completed: this._jobsCompleted,
        failed: this._jobsFailed
      };
    });
  return this._result.track(result);
};


module.exports = Worker;
