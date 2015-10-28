'use strict';

var redis = require('redis');
var Queue = require('../lib/Queue');
var QueueClient = require('../lib/QueueClient');
var Promise = require('bluebird');
var express = require('express');

var client = redis.createClient({
  host: process.env.REDIS_HOST
});

beforeEach(function (done) {
  return client.flushall(done);
});

function create() {
  var queue = new Queue('test', client);
  if (process.env.HTTP_CLIENT) {
    var app = express();
    app.use('/api', queue.api());
    return Promise.fromCallback(function (callback) {
      var server = app.listen(0, function (err) {
        if (err) {
          return callback(err);
        }
        callback(null, server.address().port);
      });
    })
      .then(function (port) {
        var queueClient = new QueueClient('http://localhost:' + port + '/api');
        queueClient._runDelayedCycle = queue._runDelayedCycle.bind(queue);
        return queueClient;
      });
  } else {
    return Promise.resolve(queue);
  }
}

exports .create = create;
