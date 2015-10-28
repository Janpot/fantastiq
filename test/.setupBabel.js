'use strict';

var Promise = require('bluebird');

Error.stackTraceLimit = Infinity;
Promise.longStackTraces();
//require('request-promise').debug = true;

require('babel/register')({
  stage: 1
});
