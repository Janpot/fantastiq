'use strict';

var redis = require('redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;
var Promise = require('bluebird');
var sinon = require('sinon');

describe('Queue._runCleanupCycle', function () {

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

  it('should clean up jobs when expired', async function () {
    clock = sinon.useFakeTimers(Date.now());
    var ids = await queue.addN([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    await Promise.each(ids, async function () {
      var result = await queue.retrieve();
      var error = ((result.data % 2) === 0) ? new Error('Failed') : null;
      queue.acknowledge(result.id, error);
    });

    await queue.config({
      removeFailedAfter: 5000, removeCompletedAfter: 10000
    });

    clock.tick(4999);
    var cleanedCount = await queue._runCleanupCycle();
    assert.strictEqual(cleanedCount, 0);

    var stats = await queue.stat();
    assert.propertyVal(stats, 'completedCount', 5);
    assert.propertyVal(stats, 'failedCount', 5);

    clock.tick(2);
    cleanedCount = await queue._runCleanupCycle();
    assert.strictEqual(cleanedCount, 5);

    stats = await queue.stat();
    assert.propertyVal(stats, 'completedCount', 5);
    assert.propertyVal(stats, 'failedCount', 0);

    clock.tick(4998);
    stats = await queue.stat();
    assert.propertyVal(stats, 'completedCount', 5);
    assert.propertyVal(stats, 'failedCount', 0);

    clock.tick(2);
    cleanedCount = await queue._runCleanupCycle();
    assert.strictEqual(cleanedCount, 5);

    stats = await queue.stat();
    assert.propertyVal(stats, 'completedCount', 0);
    assert.propertyVal(stats, 'failedCount', 0);
  });

  it('should return 0 when locked', async function () {
    clock = sinon.useFakeTimers(Date.now());

    var ids = await queue.addN([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    await Promise.each(ids, async function () {
      var result = await queue.retrieve();
      var error = ((result.data % 2) === 0) ? new Error('Failed') : null;
      queue.acknowledge(result.id, error);
    });

    await queue.config({
      removeFailedAfter: 1000, removeCompletedAfter: 2000
    });

    clock.tick(1500);
    var cleanedCount = await queue._runCleanupCycle(10000);
    assert.strictEqual(cleanedCount, 5);

    clock.tick(1000);
    // completed ones are now ready to be cleaned but the lock should prevent it
    cleanedCount = await queue._runCleanupCycle(10000);
    assert.strictEqual(cleanedCount, 0);
  });

});
