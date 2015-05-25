var redis = require('then-redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;

describe('Queue.addN', function () {

  var client = redis.createClient({
    host: process.env.REDIS_HOST
  });
  var queue = new Queue('test', client);

  beforeEach(function () {
    return client.flushall();
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

  it('should handle falsy values', function () {
    var values = [0, '', [], false, null, undefined];
    return queue.addN(values)
      .then(function (ids) {
        return queue.getN(ids);
      })
      .then(function (jobs) {
        var data = jobs.map(function (job) {
          return job.data;
        });
        assert.deepEqual(data, [0, '', [], false, null, null]);
      });
  });

  it('should preserve type', function () {
    return queue.addN([{ some: 'data' }, 2, [ 1, 2, 3 ]])
      .then(function (ids) {
        return queue.getN(ids);
      })
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

  it('should add a job with priority', function () {
    return queue.add(1, { priority: 5 })
      .then(function (id) {
        return queue.get(id);
      })
      .then(function (job) {
        assert.strictEqual(job.priority, 5);
      });
  });

});
