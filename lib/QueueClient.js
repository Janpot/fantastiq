'use strict';

var Promise = require('bluebird');
var request = require('request-promise');
var {resolve: resolveUrl} = require('url');
var errors = require('request-promise/errors');
var jobUtils = require('./jobUtils');

function QueueClient(url) {
  this._url = /\/^/.test(url) ? url : (url + '/');
}

QueueClient.prototype.config = function (config) {
  if (config) {
    return request.post({
      url: resolveUrl(this._url, './config'),
      body: config,
      json: true
    }).promise();
  } else {
    return request.get({
      url: resolveUrl(this._url, './config'),
      json: true
    }).promise();
  }
};

QueueClient.prototype.add = function (job, options) {
  job = typeof job === 'undefined' ? null : job;
  return request.post({
    url: resolveUrl(this._url, './jobs'),
    body: job,
    qs: options,
    json: true
  }).promise().get('id');
};

QueueClient.prototype.addN = function (jobs, options) {
  if (!Array.isArray(jobs)) {
    return Promise.reject(new Error('.addN() expects an Array'));
  }
  return Promise.mapSeries(jobs, function (job) {
    return this.add(job, options);
  }.bind(this));
};

QueueClient.prototype.get = function (id) {
  if (typeof id !== 'string') {
    return Promise.reject(
      new Error('.get is expected to be called with a string'));
  }
  return request.get({
    url: resolveUrl(this._url, './jobs/' + id),
    json: true
  }).promise()
    .then(function (job) {
      if (job) {
        if (job.error) {
          job.error = jobUtils.parseError(job.error);
        }
        return job;
      } else {
        return null;
      }
    })
    .catch(errors.StatusCodeError, function (reason) {
      if (reason.response.statusCode === 404) {
        return null;
      }
      throw reason;
    });
};

QueueClient.prototype.getN = function (jobIds) {
  return Promise.mapSeries(jobIds, function (jobId) {
    return this.get(jobId);
  }.bind(this));
};

QueueClient.prototype.stat = function () {
  return request.get({
    url: this._url,
    json: true
  }).promise();
};

QueueClient.prototype.retrieve = function (options) {
  return request.post({
    url: resolveUrl(this._url, './retrieval'),
    body: options,
    json: true
  }).promise();
};

QueueClient.prototype.acknowledge = function (id, err, result) {
  var serializedError = null;
  if (err) {
    serializedError = {
      message: err.message,
      stack: err.stack
    };
    result = null;
  }
  return request.del({
    url: resolveUrl(this._url, './retrieval/' + id),
    body: {
      result: result,
      error: serializedError
    },
    json: true
  }).promise().get('id');
};

QueueClient.prototype.remove = function (id) {
  if (typeof id !== 'string') {
    return Promise.reject(
      new Error('.remove is expected to be called with a string'));
  }
  return request.del({
    url: resolveUrl(this._url, './jobs/' + id),
    json: true
  }).promise()
    .then(function () {
      return 1;
    })
    .catch(errors.StatusCodeError, function (reason) {
      if (reason.response.statusCode === 404) {
        return 0;
      }
      throw reason;
    });
};

QueueClient.prototype.removeN = function (ids) {
  if (ids.length <= 0) {
    return Promise.resolve(0);
  }
  return Promise.map(ids, function (id) {
    return this.remove(id);
  }.bind(this))
    .reduce(function (total, count) {
      return total + count;
    });
};

module.exports = QueueClient;
