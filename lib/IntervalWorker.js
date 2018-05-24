'use strict';

var Promise = require('bluebird');

var IDLE = 0;
var ACTIVE = 1;
var STOPPING = 2;

function deferred () {
  var _resolve;
  var _reject;
  var promise = new Promise(function (resolve, reject) {
    _resolve = resolve;
    _reject = reject;
  });
  return {
    promise: promise,
    resolve: _resolve,
    reject: _reject
  };
}

function IntervalWorker (workFn, delay) {
  this._workFn = workFn;
  this._delay = delay || 0;
  this._activeWork = null;
  this._timeout = null;
  this._workerStopped = null;
  this._state = IDLE;
}

IntervalWorker.prototype._tick = function () {
  this._state = ACTIVE;
  this._activeWork = Promise.try(this._workFn)
    .bind(this)
    .then(function () {
      this._activeWork = null;
      if (this._state === ACTIVE) {
        this._timeout = setTimeout(function () {
          this._timeout = null;
          this._tick();
        }.bind(this), this._delay);
      }
    }, function (err) {
      this._activeWork = null;
      this._workerStopped.reject(err);
      this._state = IDLE;
    });
};

IntervalWorker.prototype.start = function () {
  if (this._state === IDLE) {
    this._workerStopped = deferred();
    this._tick();
  }
  return this._workerStopped.promise;
};

IntervalWorker.prototype.setDelay = function (delay) {
  this._delay = delay || 0;
};

IntervalWorker.prototype.stop = function () {
  if (this._state === ACTIVE) {
    this._state = STOPPING;
    if (this._activeWork) {
      this._activeWork.cancel();
    }
    setImmediate(function () {
      if (this._timeout) {
        clearTimeout(this._timeout);
        this._timeout = null;
      }
      Promise.resolve(this._activeWork || null)
        .bind(this)
        .catchReturn(Promise.CancellationError)
        .then(function () {
          this._state = IDLE;
          this._workerStopped.resolve();
        });
    }.bind(this));
    return this._workerStopped.promise;
  } else {
    return Promise.resolve();
  }
};

module.exports = IntervalWorker;
