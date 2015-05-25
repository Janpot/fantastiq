var redis = require('then-redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;

describe('Queue', function () {

  var client = redis.createClient({
    host: process.env.REDIS_HOST
  });
  var queue = new Queue('test', client);

  beforeEach(function () {
    return client.flushall();
  });

  describe('.method', function () {

  });

});

