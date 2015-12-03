'use strict';

var Promise = require('bluebird');

before(function () {
  Error.stackTraceLimit = Infinity;
  Promise.longStackTraces();
});
