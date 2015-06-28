'use strict';

var redis = require('then-redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;

describe('Queue.removeN', function () {

  var client = redis.createClient({
    host: process.env.REDIS_HOST
  });
  var queue = new Queue('test', client);


  beforeEach(function () {
    return client.flushall();
  });

  it('should remove multiple jobs', function () {
    return queue.addN([1, 2, 3])
      .then(function (ids) {
        return queue.removeN(ids)
          .then(function (count) {
            assert.strictEqual(count, 3);
            return queue.getN(ids);
          });
      })
      .then(function (jobs) {
        assert.sameMembers(jobs, [null]);
      });
  });

  it('shouldn\'t fail on empty jobs array', function () {
    return queue.removeN([])
      .then(function (count) {
        assert.strictEqual(count, 0);
      });
  });

  it('shouldn\'t count non-existing jobs', function () {
    return queue.removeN([1, 2, 3])
      .then(function (count) {
        assert.strictEqual(count, 0);
      });
  });

});
