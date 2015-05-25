var redis = require('then-redis');
var Queue = require('../lib/Queue');
var assert = require('chai').assert;
var config = require('./config');

describe('Queue', function () {

  var client = redis.createClient(config.redis);
  var queue = new Queue('test', client);

  beforeEach(function () {
    return client.flushall();
  });

  describe('.method', function () {

  });

});

