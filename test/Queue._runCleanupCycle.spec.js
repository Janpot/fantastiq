var redis = require('then-redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;
var config = require('./config');
var sinon = require('sinon');

describe('Queue._runCleanupCycle', function () {

  var client = redis.createClient(config.redis);
  var queue = new Queue('test', client);
  var clock = null;

  beforeEach(function () {
    return client.flushall();
  });

  afterEach(function () {
    if (clock) {
      clock.restore();
      clock = null;
    }
  });

  it('should clean up jobs when expired', function () {
    clock = sinon.useFakeTimers(Date.now());
    return queue.addN([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      .map(function () {
        return queue.retrieve().get('id').bind(queue).then(queue.get);
      })
      .map(function (job) {
        var error = ((job.data % 2) === 0) ? new Error('Failed') : null;
        return queue.acknowledge(job.id, error);
      })
      .then(function () {
        return queue.config({
          removeFailedAfter: 5000, removeCompletedAfter: 10000
        });
      })
      .then(function () {
        clock.tick(4999);
        return queue._runCleanupCycle();
      })
      .then(function (cleaned) {
        assert.strictEqual(cleaned, 0);
        return queue.stat();
      })
      .then(function (stats) {
        assert.propertyVal(stats, 'completedCount', 5);
        assert.propertyVal(stats, 'failedCount', 5);
        clock.tick(2);
        return queue._runCleanupCycle();
      })
      .then(function (cleaned) {
        assert.strictEqual(cleaned, 5);
        return queue.stat();
      })
      .then(function (stats) {
        assert.propertyVal(stats, 'completedCount', 5);
        assert.propertyVal(stats, 'failedCount', 0);
        clock.tick(4998);
        return queue.stat();
      })
      .then(function (stats) {
        assert.propertyVal(stats, 'completedCount', 5);
        assert.propertyVal(stats, 'failedCount', 0);
        clock.tick(2);
        return queue._runCleanupCycle();
      })
      .then(function (cleaned) {
        assert.strictEqual(cleaned, 5);
        return queue.stat();
      })
      .then(function (stats) {
        assert.propertyVal(stats, 'completedCount', 0);
        assert.propertyVal(stats, 'failedCount', 0);
      });
  });

  it('should return 0 when locked', function () {
    clock = sinon.useFakeTimers(Date.now());
    return queue.addN([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      .map(function () {
        return queue.retrieve().get('id').bind(queue).then(queue.get);
      })
      .map(function (job) {
        var error = ((job.data % 2) === 0) ? new Error('Failed') : null;
        return queue.acknowledge(job.id, error);
      })
      .then(function () {
        return queue.config({
          removeFailedAfter: 1000, removeCompletedAfter: 2000
        });
      })
      .then(function () {
        clock.tick(1500);
        return queue._runCleanupCycle(10000);
      })
      .then(function (cleaned) {
        assert.strictEqual(cleaned, 5);
        return queue._runCleanupCycle(10000);
      })
      .then(function (cleaned) {
        assert.strictEqual(cleaned, 0);
      });
  });

});
