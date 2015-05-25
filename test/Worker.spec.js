var Worker = require('../lib/Worker');
var assert = require('chai').assert;
var sinon = require('sinon');
var Promise = require('bluebird');


function mockQueue(mockJobs) {
  var i = 0;
  return {
    jobs: mockJobs,
    _getJob: function (id) {
      return mockJobs[Number(id)];
    },
    retrieve: function (options) {
      var mockJob = mockJobs[i];
      mockJob.retrieveOptions = options;
      mockJob.id = String(i);
      mockJob.throttle = (mockJob.throttle === undefined) ? null : mockJob.throttle;
      if (mockJob.retrieveErr) {
        return Promise.reject(mockJob.retrieveErr);
      } else {
        i += 1;
        return Promise.resolve(mockJob);
      }
    },
    get: function (id) {
      var mockJob = this._getJob(id);
      mockJob.data = mockJob.data || null;
      if (mockJob.getErr) {
        return Promise.reject(mockJob.getErr);
      } else {
        return Promise.resolve(mockJob);
      }
    },
    acknowledge: function (id, error, result) {
      var mockJob = this._getJob(id);
      mockJob.error = error;
      mockJob.result = result;
      if (mockJob.acknowledgeErr) {
        return Promise.reject(mockJob.acknowledgeErr);
      } else {
        return Promise.resolve();
      }
    }
  };
}


describe('Worker', function () {

  var clock = null;

  before(function () {
    clock = sinon.useFakeTimers(0);
  });

  after(function () {
    clock.restore();
  });

  it('should execute a job', function () {
    var queue = mockQueue([
      { data: 1 }
    ]);
    var worker = null;

    worker = new Worker(queue, function (job) {
      return Promise.resolve(job);
    });
    worker.start();

  });

});

