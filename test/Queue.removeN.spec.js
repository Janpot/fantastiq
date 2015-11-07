'use strict';

var assert = require('chai').assert;

module.exports = function (queue) {
  return function () {

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
      return queue.removeN(['a', '1', 'jahsgd'])
        .then(function (count) {
          assert.strictEqual(count, 0);
        });
    });
  };
};
