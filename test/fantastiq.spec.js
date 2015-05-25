var redis = require('then-redis');
var fantastiq = require('..');
var assert = require('chai').assert;
var config = require('./config');

describe('fantastiq', function () {

  var client = redis.createClient(config.redis);

  beforeEach(function () {
    return client.flushall();
  });


});

