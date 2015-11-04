'use strict';

var queueFactory = require('./queueFactory');
var assert = require('chai').assert;
var request = require('supertest-as-promised');
var express = require('express');

describe('Queue.api', function () {

  var queue;
  var app = express();

  before(function () {
    return queueFactory.create()
      .then(function (_queue) {
        queue = _queue;
        app.use('/api', queue.api());
      });
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

  it('should remove an existing job', function () {
    var id;
    return queue.add('job')
      .then(function (_id) {
        id = _id;
        return request(app)
          .delete('/api/jobs/' + id)
          .expect(200);
      })
      .then(function () {
        return queue.get(id);
      })
      .then(function (job) {
        assert.isNull(job);
      });
  });

  it('should 404 on removing a non-existing job', function () {
    return request(app)
      .delete('/api/jobs/non-existing')
      .expect(404);
  });

  it('should add a job', function () {
    return request(app)
      .post('/api/jobs')
      .set('content-type', 'application/json')
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
        assert.propertyVal(res.body, 'delayedCount', 0);
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

  it('should retrieve jobs', function () {
    return queue.add(0)
      .then(function (id) {
        return request(app)
          .post('/api/retrieval')
          .expect(200)
          .then(function (res) {
            assert.propertyVal(res.body, 'id', id);
          });
      });
  });

  it('should acknowledge a job with a result', function () {
    return queue.add(0)
      .then(function () {
        return queue.retrieve();
      })
      .then(function (result) {
        return request(app)
          .delete('/api/retrieval/' + result.id)
          .send({
            result: 'result'
          })
          .expect(200)
          .then(function (res) {
            return queue.get(res.body.id);
          });
      })
      .then(function (job) {
        assert.strictEqual(job.result, 'result');
        assert.strictEqual(job.state, 'completed');
      });
  });

  it('should acknowledge a job with an error', function () {
    return queue.add(0)
      .then(function () {
        return queue.retrieve();
      })
      .then(function (result) {
        return request(app)
          .delete('/api/retrieval/' + result.id)
          .send({
            result: 'result',
            error: {
              message: 'err',
              stack: 'stack'
            }
          })
          .expect(200)
          .then(function (res) {
            return queue.get(res.body.id);
          });
      })
      .then(function (job) {
        assert.notOk(job.result);
        assert.strictEqual(job.state, 'failed');
        assert.deepPropertyVal(job.error, 'message', 'err');
        assert.deepPropertyVal(job.error, 'stack', 'stack');
      });
  });

  it('should acknowledge a non-existing job with a 404', function () {
    return request(app)
      .delete('/api/retrieval/non-existing')
      .send({
        result: 'result',
        error: {
          message: 'err',
          stack: 'stack'
        }
      })
      .expect(404);
  });

  it('should change config', function () {
    return request(app)
      .post('/api/config')
      .send({
        unique: true,
        attempts: 3
      })
      .expect(200)
      .then(function (res) {
        assert.propertyVal(res.body, 'timeout', 30000);
        assert.propertyVal(res.body, 'attempts', 3);
        assert.propertyVal(res.body, 'unique', true);
      });
  });

  it('should retrieve config', function () {
    return queue.config({
      timeout: 5678
    })
      .then(function () {
        return request(app)
          .get('/api/config')
          .expect(200)
          .then(function (res) {
            assert.propertyVal(res.body, 'timeout', 5678);
            assert.notOk(res.body.unique);
          });
      });
  });

  it('should add multiple jobs', function () {
    return request(app)
      .post('/api/jobs')
      .set('content-type', 'application/x-ldjson')
      .send('"job-1"\n"job-2"\n{"job": 3}')
      .expect(200)
      .then(function (res) {
        assert.deepEqual(res.body.map(function (job) { return job.data; }), [
          'job-1',
          'job-2',
          {job: 3}
        ]);
      });
  });

});
