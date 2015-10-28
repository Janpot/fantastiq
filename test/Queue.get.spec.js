'use strict';

var redis = require('redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;

describe('Queue.get', function () {

  var client = redis.createClient({
    host: process.env.REDIS_HOST
  });
  var queue = new Queue('test', client);

  beforeEach(function (done) {
    return client.flushall(done);
  });


  it('should return a job', function () {
    return queue.addN([0, 1, 2, 3, 4])
      .then(function (ids) {
        return queue.get(ids[2]);
      })
      .then(function (job) {
        assert.propertyVal(job, 'data', 2);
      });
  });

  it('should return null on a non-existing job', function () {
    return queue.addN([0, 1, 2, 3, 4])
      .then(function () {
        return queue.get('some-bogus-id');
      })
      .then(function (job) {
        assert.isNull(job);
      });
  });

  it('should fail when not called with a string', function () {
    return queue.add(1)
      .then(function () {
        return queue.get([]);
      })
      .then(function () {
        assert(false, 'Expected to fail');
      }, function (err) {
        assert.strictEqual(err.message,
          '.get is expected to be called with a string');
      });
  });

  it('should preserve errors', function () {
    return queue.add(1)
      .then(function () {
        return queue.retrieve();
      })
      .then(function (result) {
        var error = new Error('Job error');
        error.stack = 'Error stacktrace';
        return queue.acknowledge(result.id, error);
      })
      .then(function (id) {
        return queue.get(id);
      })
      .then(function (job) {
        assert.instanceOf(job.error, Error);
        assert.propertyVal(job.error, 'message', 'Job error');
        assert.propertyVal(job.error, 'stack', 'Error stacktrace');
      });
  });

});

