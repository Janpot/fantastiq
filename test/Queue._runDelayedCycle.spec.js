'use strict';

var redis = require('then-redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;
var sinon = require('sinon');

describe('Queue._runDelayedCycle', function () {

  var client = redis.createClient({
    host: process.env.REDIS_HOST
  });
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

  it('should move delayed jobs when delay expires', function () {
    var now = Date.now();
    clock = sinon.useFakeTimers(now);
    var id = null;
    return queue.add(1, { runAt: now + 1000 })
      .then(function (_id) {
        id = _id;
        clock.tick(999);
        return queue._runDelayedCycle();
      })
      .then(function (count) {
        assert.strictEqual(count, 0);
        return queue.get(id);
      })
      .then(function (job) {
        assert.propertyVal(job, 'state', 'delayed');
        return queue.stat();
      })
      .then(function (stats) {
        assert.propertyVal(stats, 'totalCount', 1);
        assert.propertyVal(stats, 'delayedCount', 1);
        return queue.retrieve();
      })
      .then(function (result) {
        assert.isNull(result.id);
        clock.tick(2);
        return queue._runDelayedCycle();
      })
      .then(function (count) {
        assert.strictEqual(count, 1);
        return queue.get(id);
      })
      .then(function (job) {
        assert.propertyVal(job, 'state', 'inactive');
        return queue.retrieve();
      })
      .then(function (result) {
        assert.propertyVal(result, 'id', id);
      });
  });

  it('should preserve priority', function () {
    var now = Date.now();
    clock = sinon.useFakeTimers(now);
    var id1 = null;
    var id2 = null;
    return queue.add(1, { priority: 10, runAt: now + 1000 })
      .then(function (_id1) {
        id1 = _id1;
        return queue.add(1, { priority: 0, runAt: now + 1000 });
      })
      .then(function (_id2) {
        id2 = _id2;
        clock.tick(1001);
        return queue._runDelayedCycle();
      })
      .then(function () {
        return queue.retrieve();
      })
      .then(function (job) {
        assert.propertyVal(job, 'id', id2);
        return queue.retrieve();
      })
      .then(function (job) {
        assert.propertyVal(job, 'id', id1);
      });
  });

});
