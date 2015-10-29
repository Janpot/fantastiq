'use strict';

var Promise = require('bluebird');
var redis = require('redis');
var child_process = Promise.promisifyAll(require('child_process'), {
  multiArgs: true
});
var assert = require('chai').assert;
var fantastiq = require('..');

describe('cli', function () {
  this.timeout(10000);

  var client = redis.createClient({
    host: process.env.REDIS_HOST
  });
  var queue = fantastiq(client);

  it('should add a job', function () {
    return child_process.execAsync(`fantastiq -r tcp://${process.env.REDIS_HOST}:6379 add -j job-1`)
      .spread(function (stdout, stderr) {
        var id = stdout.trim();
        return queue.get(id);
      })
      .then(function (job) {
        assert.ok(job);
        assert.propertyVal(job, 'data', 'job-1');
        assert.propertyVal(job, 'priority', 0);
      });
  });

  it('should add a json job', function () {
    return child_process.execAsync(`fantastiq -r tcp://${process.env.REDIS_HOST}:6379 add -j '{"hello": "world"}'`)
      .spread(function (stdout, stderr) {
        var id = stdout.trim();
        return queue.get(id);
      })
      .then(function (job) {
        assert.ok(job);
        assert.deepEqual(job.data, {hello: 'world'});
      });
  });

  it('should add multiple jobs', function () {
    return child_process.execAsync(`fantastiq -r tcp://${process.env.REDIS_HOST}:6379 add -j job-2 -j='-3' -j '{"job": 4}'`)
      .spread(function (stdout, stderr) {
        var ids = stdout.trim().split(/\s/);
        return queue.getN(ids);
      })
      .spread(function (job1, job2, job3) {
        assert.ok(job1);
        assert.ok(job2);
        assert.ok(job3);
        assert.propertyVal(job1, 'data', 'job-2');
        assert.propertyVal(job2, 'data', -3);
        assert.deepEqual(job3.data, {job: 4});
      });
  });

  it('should add jobs from stdin', function () {
    return child_process.execAsync(`printf "job-5\\n{\\"job\\": 6}\\njob-7" | fantastiq -r tcp://${process.env.REDIS_HOST}:6379 add`)
      .spread(function (stdout, stderr) {
        var ids = stdout.trim().split(/\s/);
        return queue.getN(ids);
      })
      .spread(function (job1, job2, job3) {
        assert.ok(job1);
        assert.ok(job2);
        assert.ok(job3);
        assert.propertyVal(job1, 'data', 'job-5');
        assert.deepEqual(job2.data, {job: 6});
        assert.propertyVal(job3, 'data', 'job-7');
      });
  });

  it('should use batch size', function () {
    return child_process.execAsync(`printf "a\\nb\\nc\\nd\\ne" | fantastiq -r tcp://${process.env.REDIS_HOST}:6379 add -b 2`)
      .spread(function (stdout, stderr) {
        var ids = stdout.trim().split(/\s/);
        return queue.getN(ids);
      })
      .then(function (jobs) {
        assert.deepEqual(jobs.map(function (job) {
          return job.data;
        }), ['a', 'b', 'c', 'd', 'e']);
      });
  });

  it('should add a job with priority', function () {
    return child_process.execAsync(`fantastiq -r tcp://${process.env.REDIS_HOST}:6379 add -j job-8 -p 15`)
      .spread(function (stdout, stderr) {
        var id = stdout.trim();
        return queue.get(id);
      })
      .then(function (job) {
        assert.ok(job);
        assert.propertyVal(job, 'data', 'job-8');
        assert.propertyVal(job, 'priority', 15);
      });
  });

  it('should get a job', function () {
    return queue.add('the-job')
      .then(function (id) {
        return child_process.execAsync(`fantastiq -r tcp://${process.env.REDIS_HOST}:6379 get ${id}`);
      })
      .spread(function (stdout) {
        var job = JSON.parse(stdout);
        assert.propertyVal(job, 'data', 'the-job');
      });
  });

});
