'use strict';

var fantastiq = require('..');
var express = require('express');
var faker = require('faker');
var redis = require('redis');
var Promise = require('bluebird');

Error.stackTraceLimit = Infinity;
Promise.config({
  longStackTraces: true,
  warnings: true
});

var client = redis.createClient();

var queue = fantastiq(client);

queue.config({
  removeCompletedAfter: 5 * 60 * 1000,
  timeout: 900
});

var app = express();

app.use('/ui', queue.ui(), function (err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err.stack);
  res.status(500).end();
});

app.listen(3000, function (err) {
  if (err) {
    return console.error(err.stack);
  }
  console.log('listening on port 3000');
});

function startQueueProducer (speed) {
  (function tick () {
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
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write('processing... ' + job);
  return Promise.delay(Math.random() * 100)
    .then(function () {
      if (Math.random() < 0.01) {
        throw new Error('Job failed');
      }
      return {
        success: true,
        email: job
      };
    });
});

queue.on('error', function (err) {
  console.error(err);
});

startQueueProducer(1000);
