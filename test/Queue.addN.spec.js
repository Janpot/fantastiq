/* global it, afterEach */

'use strict';

var assert = require('chai').assert;
var sinon = require('sinon');

module.exports = function (queue, client) {
  return function () {
    var clock = null;

    afterEach(function () {
      if (clock) {
        clock.restore();
        clock = null;
      }
      if (client && client.send_command.restore) {
        client.send_command.restore();
      }
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

    it('should add multiple jobs with the same data', function () {
      return queue.config({ unique: false })
        .then(function () {
          return queue.addN([1, 1, 1]);
        })
        .then(function (ids) {
          assert.lengthOf(ids, 3);
          return queue.getN(ids);
        })
        .then(function (jobs) {
          assert.propertyVal(jobs[0], 'data', 1);
          assert.propertyVal(jobs[1], 'data', 1);
          assert.propertyVal(jobs[2], 'data', 1);
          return queue.stat();
        })
        .then(function (stats) {
          assert.propertyVal(stats, 'inactiveCount', 3);
        });
    });

    it('shouldn\'t add duplicate jobs when unique is configured', function () {
      return queue.config({ unique: true })
        .then(function () {
          return queue.addN([1, 2, 1, 1, 1]);
        })
        .then(function (ids) {
          assert.lengthOf(ids, 5);
          assert.notStrictEqual(ids[0], ids[1]);
          assert.strictEqual(ids[0], ids[2]);
          assert.strictEqual(ids[0], ids[3]);
          assert.strictEqual(ids[0], ids[4]);
          return queue.getN(ids);
        })
        .then(function (jobs) {
          assert.propertyVal(jobs[0], 'data', 1);
          assert.propertyVal(jobs[1], 'data', 2);
          assert.propertyVal(jobs[2], 'data', 1);
          assert.propertyVal(jobs[3], 'data', 1);
          assert.propertyVal(jobs[4], 'data', 1);
          return queue.stat();
        })
        .then(function (stats) {
          assert.propertyVal(stats, 'inactiveCount', 2);
        });
    });

    it('shouldn\'t add duplicate object type jobs', function () {
      return queue.config({ unique: true })
        .then(function () {
          return queue.addN([{x: 1}, {x: 1}]);
        })
        .then(function (ids) {
          assert.lengthOf(ids, 2);
          assert.strictEqual(ids[0], ids[1]);
        });
    });

    it('shouldn\'t add duplicate null type jobs', function () {
      return queue.config({ unique: true })
        .then(function () {
          return queue.addN([null, null]);
        })
        .then(function (ids) {
          assert.lengthOf(ids, 2);
          assert.strictEqual(ids[0], ids[1]);
        });
    });

    it('shouldn\'t add duplicate jobs when unique by key is configured', function () {
      var ids1;
      return queue.config({ unique: true, uniqueKey: 'key' })
        .then(function () {
          return queue.addN([
            { key: '1', x: 'a' },
            { key: '2', x: 'b' },
            { key: '1', x: 'c' },
            { key: '1', x: 'd' },
            { key: '3', x: 'e' },
            { key: '2', x: 'f' }
          ]);
        })
        .then(function (ids) {
          ids1 = ids;
          assert.lengthOf(ids, 6);
          assert.notStrictEqual(ids[0], ids[1]);
          assert.strictEqual(ids[0], ids[2]);
          assert.strictEqual(ids[0], ids[3]);
          assert.notStrictEqual(ids[0], ids[4]);
          assert.notStrictEqual(ids[1], ids[4]);
          assert.strictEqual(ids[1], ids[5]);
          return queue.addN([{ key: '1', x: 'g' }]);
        })
        .then(function (ids2) {
          assert.strictEqual(ids1[0], ids2[0]);
          return queue.getN(ids1);
        })
        .then(function (jobs) {
          assert.propertyVal(jobs[0].data, 'x', 'a');
          assert.propertyVal(jobs[1].data, 'x', 'b');
          assert.propertyVal(jobs[2].data, 'x', 'a');
          assert.propertyVal(jobs[3].data, 'x', 'a');
          assert.propertyVal(jobs[4].data, 'x', 'e');
          assert.propertyVal(jobs[5].data, 'x', 'b');
        });
    });

    it('should fail on bad key values', function () {
      return queue.config({ unique: true, uniqueKey: 'key' })
        .then(function () {
          return queue.addN([5]).then(assert.fail, function (err) {
            assert.strictEqual(err.message, 'Job requires a key');
          });
        })
        .then(function () {
          return queue.addN([null]).then(assert.fail, function (err) {
            assert.strictEqual(err.message, 'Job requires a key');
          });
        })
        .then(function () {
          return queue.addN([{}]).then(assert.fail, function (err) {
            assert.strictEqual(err.message, 'Job requires a key');
          });
        })
        .then(function () {
          return queue.addN([{key: {}}]).then(assert.fail, function (err) {
            assert.strictEqual(err.message, 'Invalid key');
          });
        })
        .then(function () {
          return queue.addN([{key: 5}]).then(assert.fail, function (err) {
            assert.strictEqual(err.message, 'Invalid key');
          });
        })
        .then(function () {
          return queue.addN([{key: true}]).then(assert.fail, function (err) {
            assert.strictEqual(err.message, 'Invalid key');
          });
        });
    });

    it('should add all or nothing at all', function () {
      return queue.config({ unique: true, uniqueKey: 'key' })
        .then(function () {
          return queue.addN([
            {key: '1'},
            {key: '2'},
            5
          ]).then(assert.fail, function (err) {
            assert.strictEqual(err.message, 'Job requires a key');
          });
        })
        .then(function () {
          return queue.stat();
        })
        .then(function (stat) {
          assert.strictEqual(stat.totalCount, 0);
        });
    });

    it('should handle falsy values', function () {
      var values = [0, '', [], false, null, undefined];
      return queue.addN(values)
        .bind(queue)
        .then(queue.getN)
        .then(function (jobs) {
          var data = jobs.map(function (job) {
            return job.data;
          });
          assert.deepEqual(data, [0, '', [], false, null, null]);
        });
    });

    it('should preserve type', function () {
      return queue.addN([{ some: 'data' }, 2, [ 1, 2, 3 ]])
        .bind(queue)
        .then(queue.getN)
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

    it('should return immediately on empty array', function () {
      if (client) {
        sinon.spy(client, 'send_command');
      }
      return queue.addN([])
        .then(function (jobs) {
          assert.deepEqual(jobs, []);
          if (client) {
            assert.strictEqual(client.send_command.called, false);
          }
        });
    });

    it('should add delayed jobs', function () {
      var now = Date.now();
      clock = sinon.useFakeTimers(now);
      return queue.addN([1, 2, 3], {
        runAt: now + 1000
      })
        .bind(queue)
        .then(queue.getN)
        .each(function (job) {
          assert.propertyVal(job, 'state', 'delayed');
          assert.propertyVal(job, 'runAt', now + 1000);
        });
    });

    it('should add delayed jobs in the past', function () {
      var now = Date.now();
      clock = sinon.useFakeTimers(now);
      return queue.addN([1, 2, 3], {
        runAt: now - 1000
      })
        .bind(queue)
        .then(queue.getN)
        .each(function (job) {
          assert.propertyVal(job, 'state', 'inactive');
          assert.notOk(job.runAt);
        });
    });
  };
};
