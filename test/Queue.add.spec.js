var redis = require('then-redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;

describe('Queue.add', function () {

  var client = redis.createClient({
    host: process.env.REDIS_HOST
  });
  var queue = new Queue('test', client);

  beforeEach(function () {
    return client.flushall();
  });

  it('should add jobs', function () {
    var idJob1;
    return queue.add('job-data-1')
      .then(function (id) {
        return queue.get(id);
      })
      .then(function (job1) {
        assert.isDefined(job1.id);
        assert.strictEqual(job1.state, 'inactive');
        assert.typeOf(job1.created, 'number');
        idJob1 = job1.id;
        assert.strictEqual(job1.data, 'job-data-1');
        return queue.stat();
      })
      .then(function (stats) {
        assert.propertyVal(stats, 'inactiveCount', 1);
        return queue.add('job-data-2');
      })
      .then(function (id) {
        return queue.get(id);
      })
      .then(function (job2) {
        assert.isDefined(job2.id);
        assert.notEqual(idJob1, job2.id);
        assert.strictEqual(job2.data, 'job-data-2');
        return queue.stat();
      })
      .then(function (stats) {
        assert.propertyVal(stats, 'inactiveCount', 2);
        return queue.add('job-data-2');
      });
  });

  it('should add a job with priority', function () {
    return queue.add(1, { priority: 5 })
      .then(function (id) {
        return queue.get(id);
      })
      .then(function (job) {
        assert.strictEqual(job.priority, 5);
      });
  });

});
