'use strict';

var queueFactory = require('./queueFactory');
var assert = require('chai').assert;
var sinon = require('sinon');

describe('Queue.acknowledge @http', function () {

  var queue;
  var clock = null;

  before(function () {
    return queueFactory.create()
      .then(function (_queue) {
        queue = _queue;
      });
  });

  afterEach(function () {
    if (clock) {
      clock.restore();
      clock = null;
    }
  });

  it('should acknowledge jobs with result', function () {
    return queue.add('data-1')
      .then(function () {
        return queue.retrieve();
      })
      .then(function (result) {
        return queue.acknowledge(result.id, null, 'result-1');
      })
      .bind(queue).then(queue.get)
      .then(function (job) {
        assert.strictEqual(job.state, 'completed');
        assert.notOk(job.error);
        assert.strictEqual(job.result, 'result-1');
        assert.typeOf(job.finished, 'number');
        return queue.stat();
      })
      .then(function (stats) {
        assert.propertyVal(stats, 'inactiveCount', 0);
        assert.propertyVal(stats, 'activeCount', 0);
        assert.propertyVal(stats, 'completedCount', 1);
      });
  });

  it('should acknowledge jobs with error', function () {
    return queue.add('data-1')
      .then(function () {
        return queue.retrieve();
      })
      .then(function (result) {
        return queue.acknowledge(result.id, new Error('failed'));
      })
      .bind(queue).then(queue.get)
      .then(function (job) {
        assert.strictEqual(job.state, 'failed');
        assert.instanceOf(job.error, Error);
        assert.notOk(job.result);
        assert.typeOf(job.finished, 'number');
        return queue.stat();
      })
      .then(function (stats) {
        assert.propertyVal(stats, 'inactiveCount', 0);
        assert.propertyVal(stats, 'activeCount', 0);
        assert.propertyVal(stats, 'failedCount', 1);
      });
  });

  it('should fail when not active', function () {
    return queue.add('data-1')
      .then(function (jobId) {
        return queue.acknowledge(jobId, null, 'result-1');
      })
      .then(function () {
        assert(false, 'Expected to fail');
      }, function (err) {
        assert.instanceOf(err, Error);
      });
  });

  it('should do multiple attempts', function () {
    var id = null;
    return queue.config({ attempts: 3 })
      .then(function () {
        return queue.add(1);
      })
      .then(function (_id) {
        id = _id;
        return queue.get(id);
      })
      .then(function (job) {
        assert.propertyVal(job, 'attempts', 0);
      })
      .then(function () {
        return queue.retrieve();
      })
      .then(function (result) {
        assert.propertyVal(result, 'id', id);
        return queue.get(id);
      })
      .then(function (job) {
        assert.propertyVal(job, 'attempts', 1);
      })
      .then(function () {
        return queue.acknowledge(id, new Error('hello'));
      })
      .then(function () {
        return queue.get(id);
      })
      .then(function (job) {
        assert.propertyVal(job, 'state', 'inactive');
        return queue.retrieve();
      })
      .then(function (result) {
        assert.propertyVal(result, 'id', id);
        return queue.get(id);
      })
      .then(function (job) {
        assert.propertyVal(job, 'attempts', 2);
        return queue.acknowledge(id, new Error('hello'));
      })
      .then(function () {
        return queue.get(id);
      })
      .then(function (job) {
        assert.propertyVal(job, 'state', 'inactive');
        assert.notOk(job.started);
        assert.notOk(job.finished);
        return queue.retrieve();
      })
      .then(function (result) {
        assert.propertyVal(result, 'id', id);
        return queue.get(id);
      })
      .then(function (job) {
        assert.propertyVal(job, 'attempts', 3);
        return queue.acknowledge(id, new Error('hello'));
      })
      .then(function () {
        return queue.get(id);
      })
      .then(function (job) {
        assert.propertyVal(job, 'state', 'failed');
        return queue.retrieve();
      })
      .then(function (result) {
        assert.isNull(result.id);
      });

  });

  it('should acknowledge with backoff time', function () {
    var now = Date.now();
    clock = sinon.useFakeTimers(now);
    var id;
    return queue.config({ attempts: 2, backoff: 10000 })
      .then(function () {
        return queue.add('data-1');
      })
      .then(function () {
        return queue.retrieve();
      })
      .then(function (result) {
        id = result.id;
        clock.tick(5000);
        return queue.acknowledge(id, new Error('failed'));
      })
      .bind(queue).then(queue.get)
      .then(function (job) {
        assert.strictEqual(job.state, 'delayed');
        assert.notOk(job.error);
        assert.strictEqual(job.runAt, now + 15000);
        clock.tick(9999);
        return queue._runDelayedCycle();
      })
      .then(function () {
        return queue.get(id);
      })
      .then(function (job) {
        assert.strictEqual(job.state, 'delayed');
        clock.tick(2);
        return queue._runDelayedCycle();
      })
      .then(function () {
        return queue.get(id);
      })
      .then(function (job) {
        assert.strictEqual(job.state, 'inactive');
        return queue.retrieve(id);
      })
      .then(function (result) {
        assert.strictEqual(result.data, 'data-1');
      });
  });


});
