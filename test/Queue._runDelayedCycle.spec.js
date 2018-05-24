/* eslint-env mocha */

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');
var Promise = require('bluebird');

module.exports = function (createQueue) {
  return function () {
    var clock = null;
    var queue = null;

    before(() => {
      queue = createQueue();
    });

    afterEach(function () {
      if (clock) {
        clock.restore();
        clock = null;
      }
    });

    it('should move delayed jobs when delay expires', Promise.coroutine(function * () {
      var now = Date.now();
      clock = sinon.useFakeTimers(now);
      var id = yield queue.add(1, { runAt: now + 1000 });

      clock.tick(999);
      var activatedCount = yield queue._runDelayedCycle();
      assert.strictEqual(activatedCount, 0);

      var job = yield queue.get(id);
      assert.propertyVal(job, 'state', 'delayed');

      var stats = yield queue.stat();
      assert.propertyVal(stats, 'totalCount', 1);
      assert.propertyVal(stats, 'delayedCount', 1);

      var retrieval = yield queue.retrieve();
      assert.isNull(retrieval.id);

      clock.tick(2);
      activatedCount = yield queue._runDelayedCycle();
      assert.strictEqual(activatedCount, 1);

      job = yield queue.get(id);
      assert.propertyVal(job, 'state', 'inactive');

      retrieval = yield queue.retrieve();
      assert.propertyVal(retrieval, 'id', id);
    }));

    it('should preserve priority', Promise.coroutine(function * () {
      var now = Date.now();
      clock = sinon.useFakeTimers(now);
      var id1 = yield queue.add(1, { priority: 10, runAt: now + 1000 });
      var id2 = yield queue.add(1, { priority: 0, runAt: now + 1000 });

      clock.tick(1001);
      yield queue._runDelayedCycle();

      var retrieval = yield queue.retrieve();
      assert.propertyVal(retrieval, 'id', id2);

      retrieval = yield queue.retrieve();
      assert.propertyVal(retrieval, 'id', id1);
    }));
  };
};
