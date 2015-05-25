var redis = require('then-redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;
var request = require('supertest-as-promised');
var express = require('express');

describe('Queue.api', function () {

  var client = redis.createClient({
    host: process.env.REDIS_HOST
  });
  var queue = new Queue('test', client);
  var app = express();
  app.use('/api', queue.api());

  beforeEach(function () {
    return client.flushall();
});

  it('should 404 on non-existing job', function () {
    return request(app)
      .get('/api/jobs/non-existing')
      .expect(404);
  });

  it('should return an existing job', function () {
    return queue.add('job')
      .then(function (id) {
        return request(app)
          .get('/api/jobs/' + id)
          .expect(200);
      })
      .then(function (res) {
        assert.propertyVal(res.body, 'data', 'job');
      });
  });

  it('should add a job', function () {
    return request(app)
      .post('/api/jobs')
      .send('"job"')
      .expect(200)
      .then(function (res) {
        assert.propertyVal(res.body, 'data', 'job');
        assert.propertyVal(res.body, 'state', 'inactive');
        assert.propertyVal(res.body, 'priority', 0);
      });
  });

  it('should add a job with priority', function () {
    return request(app)
      .post('/api/jobs?priority=10')
      .send('"job"')
      .expect(200)
      .then(function (res) {
        assert.propertyVal(res.body, 'priority', 10);
      });
  });

  it('should return stats', function () {
    return request(app)
      .get('/api')
      .expect(200)
      .then(function (res) {
        assert.propertyVal(res.body, 'totalCount', 0);
        assert.propertyVal(res.body, 'inactiveCount', 0);
        assert.propertyVal(res.body, 'activeCount', 0);
        assert.propertyVal(res.body, 'completedCount', 0);
        assert.propertyVal(res.body, 'failedCount', 0);
      });
  });

  it('should return stats', function () {
    return request(app)
      .get('/api')
      .expect(200)
      .then(function (res) {
        assert.propertyVal(res.body, 'totalCount', 0);
        assert.propertyVal(res.body, 'inactiveCount', 0);
        assert.propertyVal(res.body, 'activeCount', 0);
        assert.propertyVal(res.body, 'completedCount', 0);
        assert.propertyVal(res.body, 'failedCount', 0);
      });
  });

  it('should return jobs from a state', function () {
    return queue.addN([1, 2, 3, 4, 5])
      .then(function () {
        return request(app)
          .get('/api/inactive?count=3')
          .expect(200)
          .then(function (res) {
            assert.lengthOf(res.body.jobs, 3);
            var data = res.body.jobs.map(function (job) { return job.data; });
            assert.deepEqual(data, [1, 2, 3]);
          });
      });
  });

  it('should return jobs from a state after a job', function () {
    return queue.addN([0, 1, 2, 3, 4, 5, 6])
      .then(function (ids) {
        return request(app)
          .get('/api/inactive?count=3&start=' + ids[3])
          .expect(200)
          .then(function (res) {
            assert.lengthOf(res.body.jobs, 3);
            var data = res.body.jobs.map(function (job) { return job.data; });
            assert.deepEqual(data, [3, 4, 5]);
          });
      });
  });

  it('should return jobs from a state before a job', function () {
    return queue.addN([0, 1, 2, 3, 4, 5, 6])
      .then(function (ids) {
        return request(app)
          .get('/api/inactive?count=3&end=' + ids[4])
          .expect(200)
          .then(function (res) {
            assert.lengthOf(res.body.jobs, 3);
            var data = res.body.jobs.map(function (job) { return job.data; });
            assert.deepEqual(data, [2, 3, 4]);
          });
      });
  });

  it('should return fill jobs at start', function () {
    return queue.addN([0, 1, 2, 3, 4, 5, 6])
      .then(function (ids) {
        return request(app)
          .get('/api/inactive?count=5&fill=true&end=' + ids[2])
          .expect(200)
          .then(function (res) {
            assert.lengthOf(res.body.jobs, 5);
            var data = res.body.jobs.map(function (job) { return job.data; });
            assert.deepEqual(data, [0, 1, 2, 3, 4]);
          });
      });
  });

  it('should return fill jobs at end', function () {
    return queue.addN([0, 1, 2, 3, 4, 5, 6])
      .then(function (ids) {
        return request(app)
          .get('/api/inactive?count=5&fill=true&start=' + ids[4])
          .expect(200)
          .then(function (res) {
            assert.lengthOf(res.body.jobs, 5);
            var data = res.body.jobs.map(function (job) { return job.data; });
            assert.deepEqual(data, [2, 3, 4, 5, 6]);
          });
      });
  });

  it('should recognize states', function () {
    return request(app)
      .get('/api/not-state')
      .expect(404);
  });

  it('should serialize errors', function () {
    return queue.add(0)
      .then(function () {
        return queue.retrieve();
      })
      .then(function (result) {
        return queue.acknowledge(result.id, new Error('Job error'));
      })
      .then(function (id) {
        return request(app)
          .get('/api/jobs/' + id)
          .expect(200)
          .then(function (res) {
            assert.deepPropertyVal(res.body, 'error.message', 'Job error');
          });
      })
      .then(function () {
        return request(app)
          .get('/api/failed')
          .expect(200)
          .then(function (res) {
            assert.deepPropertyVal(res.body, 'jobs[0].error.message', 'Job error');
          });
      });
  });

});

