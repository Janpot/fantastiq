/* eslint-env mocha */

'use strict';

var assert = require('chai').assert;

module.exports = function (createQueue) {
  return function () {
    var queue = null;

    before(() => {
      queue = createQueue();
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
          assert.sameMembers(jobs, [null, null, null]);
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

    it('should deindex jobs', function () {
      var ids;
      return queue.config({unique: true})
        .then(function () {
          return queue.addN([1, 2, 3]);
        })
        .then(function (_ids) {
          ids = _ids;
          return queue.removeN(ids);
        })
        .then(function () {
          return queue.addN([1, 2, 3]);
        })
        .then(function (ids2) {
          assert.notDeepEqual(ids, ids2);
        });
    });
  };
};
