/* eslint-env mocha */

'use strict';

var assert = require('chai').assert;

module.exports = function (createQueue) {
  return function () {
    var queue = null;

    before(() => {
      queue = createQueue();
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
  };
};
