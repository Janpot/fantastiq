'use strict';

var fantastiq = require('..');
var express = require('express');
var faker = require('faker');
var redis = require('then-redis');
var Promise = require('bluebird');

var client = redis.createClient({
  host: '192.168.59.103',
  port: 6379
});

var queue = fantastiq(client);

queue.config({
  removeCompletedAfter: 0
});

var app = express();

app.use('/ui', queue.ui(), function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).end();
});

app.listen(3000, function (err) {
  if (err) {
    return console.error(err.stack);
  }
  console.log('listening on port 3000');
});



function startQueueProducer(queue, speed) {
  (function tick() {
    queue.add(faker.internet.email()).catch(function (err) {
      console.log(err.stack);
    });
    setTimeout(tick, Math.random() * speed);
  }());
}

queue.config({
  throttle: null
});

queue.process(function (job) {
  // console.log('processing...', job.to);
  return Promise.delay(Math.random() * 100)
    .then(function () {
      if (Math.random() < 0.1) {
        throw new Error('Job failed');
      }
      return {
        success: true,
        email: job
      };
    });
});

startQueueProducer(queue, 100);
