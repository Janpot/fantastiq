'use strict';

var assert = require('chai').assert;

module.exports = function (queue) {
  return function () {
    it('should add jobs', async function () {
      var idJob1 = await queue.add('job-data-1');
      var job1 = await queue.get(idJob1);
      assert.isDefined(job1.id);
      assert.strictEqual(job1.state, 'inactive');
      assert.typeOf(job1.created, 'number');
      assert.strictEqual(job1.data, 'job-data-1');

      var stats = await queue.stat();
      assert.propertyVal(stats, 'inactiveCount', 1);

      var idJob2 = await queue.add('job-data-2');
      var job2 = await queue.get(idJob2);
      assert.isDefined(job2.id);
      assert.notEqual(idJob1, job2.id);
      assert.strictEqual(job2.data, 'job-data-2');

      stats = await queue.stat();
      assert.propertyVal(stats, 'inactiveCount', 2);
    });

    it('should add a job with priority', async function () {
      var id = await queue.add(1, { priority: 5 });
      var job = await queue.get(id);
      assert.strictEqual(job.priority, 5);
    });

    it('should ignore duplicate job when active', async function () {
      await queue.config({ unique: true });

      var id1 = await queue.add(1);
      await queue.retrieve();
      var id2 = await queue.add(1);
      assert.strictEqual(id1, id2);
    });

    it('should ignore duplicate job when delayed', async function () {
      await queue.config({ unique: true });

      var id1 = await queue.add(1, { runAt: Date.now() + 100000 });
      var id2 = await queue.add(1);
      assert.strictEqual(id1, id2);
    });

    it('should allow duplicate job when failed', async function () {
      await queue.config({ unique: true });

      var id1 = await queue.add(1);
      var retrieval = await queue.retrieve();
      await queue.acknowledge(retrieval.id, new Error('failed'));
      var id2 = await queue.add(1);
      assert.notStrictEqual(id1, id2);
    });

    it('should allow duplicate job when completed', async function () {
      await queue.config({ unique: true });

      var id1 = await queue.add(1);
      var retrieval = await queue.retrieve();
      await queue.acknowledge(retrieval.id);
      var id2 = await queue.add(1);
      assert.notStrictEqual(id1, id2);
    });

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
