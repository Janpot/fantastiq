'use strict';

var queueFactory = require('./queueFactory');
var assert = require('chai').assert;

describe('Queue.remove @http', function () {

  var queue;

  before(function () {
    return queueFactory.create()
      .then(function (_queue) {
        queue = _queue;
      });
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
