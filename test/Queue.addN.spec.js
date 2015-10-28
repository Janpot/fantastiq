'use strict';

var redis = require('redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;
var sinon = require('sinon');

describe('Queue.addN', function () {

  var client = redis.createClient({
    host: process.env.REDIS_HOST
  });
  var queue = new Queue('test', client);
  var clock = null;

  beforeEach(function (done) {
    return client.flushall(done);
  });

  afterEach(function () {
    if (clock) {
      clock.restore();
      clock = null;
    }
  });

  it('should add multiple jobs', function () {
    return queue.addN([1, 2, 3])
      .then(function (ids) {
        assert.lengthOf(ids, 3);
        return queue.getN(ids);
      })
      .then(function (jobs) {
        assert.propertyVal(jobs[0], 'data', 1);
        assert.propertyVal(jobs[1], 'data', 2);
        assert.propertyVal(jobs[2], 'data', 3);
        return queue.stat();
      })
      .then(function (stats) {
        assert.propertyVal(stats, 'inactiveCount', 3);
      });
  });

  it('should add multiple jobs with the same data', function () {
    return queue.addN([1, 1, 1], { unique: false })
      .then(function (ids) {
        assert.lengthOf(ids, 3);
        return queue.getN(ids);
      })
      .then(function (jobs) {
        assert.propertyVal(jobs[0], 'data', 1);
        assert.propertyVal(jobs[1], 'data', 1);
        assert.propertyVal(jobs[2], 'data', 1);
        return queue.stat();
      })
      .then(function (stats) {
        assert.propertyVal(stats, 'inactiveCount', 3);
      });
  });

  it('shouldn\'t add duplicate jobs when unique is configured', function () {
    return queue.config({ unique: true })
      .then(function () {
        return queue.addN([1, 2, 1, 1, 1]);
      })
      .then(function (ids) {
        assert.notStrictEqual(ids[0], ids[1]);
        assert.strictEqual(ids[0], ids[2]);
        assert.strictEqual(ids[0], ids[3]);
        assert.strictEqual(ids[0], ids[4]);
        assert.lengthOf(ids, 5);
        return queue.getN(ids);
      })
      .then(function (jobs) {
        assert.propertyVal(jobs[0], 'data', 1);
        assert.propertyVal(jobs[1], 'data', 2);
        assert.propertyVal(jobs[2], 'data', 1);
        assert.propertyVal(jobs[3], 'data', 1);
        assert.propertyVal(jobs[4], 'data', 1);
        return queue.stat();
      })
      .then(function (stats) {
        assert.propertyVal(stats, 'inactiveCount', 2);
      });
  });

  it('should handle falsy values', function () {
    var values = [0, '', [], false, null, undefined];
    return queue.addN(values)
      .bind(queue)
      .then(queue.getN)
      .then(function (jobs) {
        var data = jobs.map(function (job) {
          return job.data;
        });
        assert.deepEqual(data, [0, '', [], false, null, null]);
      });
  });

  it('should preserve type', function () {
    return queue.addN([{ some: 'data' }, 2, [ 1, 2, 3 ]])
      .bind(queue)
      .then(queue.getN)
      .then(function (jobs) {
        assert.deepEqual(jobs[0].data, { some: 'data' });
        assert.strictEqual(jobs[1].data, 2);
        assert.deepEqual(jobs[2].data, [ 1, 2, 3 ]);
      });
  });

  it('should error on non-Array', function () {
    return queue.addN(1)
      .then(function () {
        assert(false, 'Expected to fail');
      }, function (err) {
        assert.strictEqual(err.message, '.addN() expects an Array');
      });
  });

  it('should add delayed jobs', function () {
    var now = Date.now();
    clock = sinon.useFakeTimers(now);
    return queue.addN([1, 2, 3], {
      runAt: now + 1000
    })
      .bind(queue)
      .then(queue.getN)
      .each(function (job) {
        assert.propertyVal(job, 'state', 'delayed');
        assert.propertyVal(job, 'runAt', now + 1000);
      });
  });

  it('should add delayed jobs in the past', function () {
    var now = Date.now();
    clock = sinon.useFakeTimers(now);
    return queue.addN([1, 2, 3], {
      runAt: now - 1000
    })
      .bind(queue)
      .then(queue.getN)
      .each(function (job) {
        assert.propertyVal(job, 'state', 'inactive');
        assert.notOk(job.runAt);
      });
  });

});
