var redis = require('then-redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;
var util = require('./util');

describe('Queue.acknowledge', function () {

  var client = redis.createClient({
    host: process.env.REDIS_HOST
  });
  var queue = new Queue('test', client);


  beforeEach(function () {
    return client.flushall();
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
        assert.isNull(job.error);
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
        assert.isNull(job.result);
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

});
