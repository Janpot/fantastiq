'use strict';

var Promise = require('bluebird');

Error.stackTraceLimit = Infinity;
Promise.longStackTraces();

require('babel/register')({
  stage: 1
});
