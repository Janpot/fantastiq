/* global it */

'use strict';

var assert = require('chai').assert;
var Promise = require('bluebird');

module.exports = function (queue) {
  return function () {
    it('should add jobs', Promise.coroutine(function * () {
      var idJob1 = yield queue.add('job-data-1');
      var job1 = yield queue.get(idJob1);
      assert.isDefined(job1.id);
      assert.strictEqual(job1.state, 'inactive');
      assert.typeOf(job1.created, 'number');
      assert.strictEqual(job1.data, 'job-data-1');

      var stats = yield queue.stat();
      assert.propertyVal(stats, 'inactiveCount', 1);

      var idJob2 = yield queue.add('job-data-2');
      var job2 = yield queue.get(idJob2);
      assert.isDefined(job2.id);
      assert.notEqual(idJob1, job2.id);
      assert.strictEqual(job2.data, 'job-data-2');

      stats = yield queue.stat();
      assert.propertyVal(stats, 'inactiveCount', 2);
    }));

    it('should add a job with priority', Promise.coroutine(function * () {
      var id = yield queue.add(1, { priority: 5 });
      var job = yield queue.get(id);
      assert.strictEqual(job.priority, 5);
    }));

    it('should ignore duplicate job when active', Promise.coroutine(function * () {
      yield queue.config({ unique: true });

      var id1 = yield queue.add(1);
      yield queue.retrieve();
      var id2 = yield queue.add(1);
      assert.strictEqual(id1, id2);
    }));

    it('should ignore duplicate job when delayed', Promise.coroutine(function * () {
      yield queue.config({ unique: true });

      var id1 = yield queue.add(1, { runAt: Date.now() + 100000 });
      var id2 = yield queue.add(1);
      assert.strictEqual(id1, id2);
    }));

    it('should allow duplicate job when failed', Promise.coroutine(function * () {
      yield queue.config({ unique: true });

      var id1 = yield queue.add(1);
      var retrieval = yield queue.retrieve();
      yield queue.acknowledge(retrieval.id, new Error('failed'));
      var id2 = yield queue.add(1);
      assert.notStrictEqual(id1, id2);
    }));

    it('should allow duplicate job when completed', Promise.coroutine(function * () {
      yield queue.config({ unique: true });

      var id1 = yield queue.add(1);
      var retrieval = yield queue.retrieve();
      yield queue.acknowledge(retrieval.id);
      var id2 = yield queue.add(1);
      assert.notStrictEqual(id1, id2);
    }));

    it('should add jobs with a newline', function () {
      return queue.add('hello\nworld')
        .then(queue.get.bind(queue))
        .get('data')
        .then(function (jobData) {
          assert.strictEqual(jobData, 'hello\nworld');
        });
    });
  };
};
