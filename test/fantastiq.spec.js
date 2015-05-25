var redis = require('then-redis');
var fantastiq = require('..');
var assert = require('chai').assert;

describe('fantastiq', function () {

  var client = redis.createClient({
    host: process.env.REDIS_HOST
  });

  beforeEach(function () {
    return client.flushall();
  });


});

