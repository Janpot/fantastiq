/* global describe, it, afterEach */

'use strict';

var IntervalWorker = require('../lib/IntervalWorker');
var Promise = require('bluebird');
var assert = require('chai').assert;
var sinon = require('sinon');

describe('IntervalWorker', function () {
  var delayStub = null;

  function stubDelay () {
    var result = {
      total: 0
    };
    delayStub = sinon.stub(global, 'setTimeout', function (fn, time) {
      result.total += time;
      setImmediate(fn);
    });
    return result;
  }

  afterEach(function () {
    if (delayStub) {
      delayStub.restore();
      delayStub = null;
    }
  });

  it('should work synchronously', function () {
    var i = 0;
    var worker = new IntervalWorker(function () {
      i += 1;
      if (i >= 3) {
        worker.stop();
        return;
      }
      return i;
    }, 0);
    return worker.start()
      .then(function () {
        assert.strictEqual(i, 3);
      });
  });

  it('should work asynchronously', function () {
    var i = 0;
    var worker = new IntervalWorker(function () {
      i += 1;
      if (i >= 3) {
        worker.stop();
        return Promise.delay(10);
      }
      return Promise.delay(10).return(i);
    }, 0);
    return worker.start()
      .then(function () {
        assert.strictEqual(i, 3);
      });
  });

  it('should stop when throwing', function () {
    var i = 0;
    var expectedErr = new Error('Some error');
    var worker = new IntervalWorker(function () {
      i += 1;
      if (i >= 3) {
        throw expectedErr;
      }
    }, 0);
    return worker.start()
      .then(assert.fail, function (err) {
        assert.strictEqual(i, 3);
        assert.strictEqual(err, expectedErr);
      });
  });

  it('should stop when rejected', function () {
    var i = 0;
    var expectedErr = new Error('Some error');
    var worker = new IntervalWorker(function () {
      i += 1;
      if (i >= 3) {
        return Promise.delay(10).throw(expectedErr);
      }
    }, 0);
    return worker.start()
      .then(assert.fail, function (err) {
        assert.strictEqual(i, 3);
        assert.strictEqual(err, expectedErr);
      });
  });

  it('should restart', function () {
    var i = 0;
    var goal = 3;
    var worker = new IntervalWorker(function () {
      i += 1;
      if (i >= goal) {
        worker.stop();
      }
      return i;
    }, 0);
    return worker.start()
      .then(function () {
        assert.strictEqual(i, 3);
        goal = 7;
        return worker.start();
      })
      .then(function () {
        assert.strictEqual(i, 7);
      });
  });

  it('should delay between runs', function () {
    var delayStub = stubDelay();

    var i = 0;
    var times = [];
    var worker = new IntervalWorker(function () {
      times.push(delayStub.total);
      i += 1;
      if (i === 3) {
        worker.setDelay(300);
      } else if (i >= 5) {
        worker.stop();
      }
      return i;
    }, 101);
    return worker.start()
      .then(function () {
        assert.strictEqual(i, 5);
        assert.deepEqual(times, [ 0, 101, 202, 502, 802 ]);
      });
  });

  it('should cancel workfunction', function () {
    var isCanceled = false;
    var worker = new IntervalWorker(function () {
      return new Promise(function (resolve, reject, onCancel) {
        onCancel(function () {
          isCanceled = true;
        });
      });
    });
    worker.start();
    return Promise.delay(10)
      .then(function () {
        return worker.stop();
      })
      .then(function () {
        assert.isTrue(isCanceled);
      });
  });

  it('shouldn\'t error when stopped idle', function () {
    var worker = new IntervalWorker(function () {
      return 0;
    });
    return worker.stop();
  });

  it('should return same promise on multiple starts', function () {
    var worker = new IntervalWorker(function () {
      return 0;
    });
    var start1 = worker.start();
    var start2 = worker.start();
    return worker.stop()
      .then(function () {
        assert.strictEqual(start1, start2);
      });
  });
});
