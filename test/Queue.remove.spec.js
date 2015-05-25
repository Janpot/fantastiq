var redis = require('then-redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;
var config = require('./config');

describe('Queue.remove', function () {

  var client = redis.createClient(config.redis);
  var queue = new Queue('test', client);

  beforeEach(function () {
    return client.flushall();
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
      .then(function (id) {
        return queue.remove([]);
      })
      .then(function (job) {
        assert(false, 'Expected to fail');
      }, function (err) {
        assert.strictEqual(err.message,
          '.remove is expected to be called with a string');
      });
  });

});
