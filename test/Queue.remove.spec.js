'use strict';

var redis = require('redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;

describe('Queue.remove', function () {

  var client = redis.createClient({
    host: process.env.REDIS_HOST
  });
  var queue = new Queue('test', client);

  beforeEach(function (done) {
    return client.flushall(done);
  });

  it('should remove a job', function () {
    return queue.add(1)
      .then(function (id) {
        return queue.remove(id)
          .then(function (count) {
            assert.strictEqual(count, 1);
            return queue.get(id);
          });
      })
      .then(function (job) {
        assert.isNull(job);
      });
  });

  it('should fail when not called with a string', function () {
    return queue.add(1)
      .then(function () {
        return queue.remove([]);
      })
      .then(function () {
        assert(false, 'Expected to fail');
      }, function (err) {
        assert.strictEqual(err.message,
          '.remove is expected to be called with a string');
      });
  });

});
