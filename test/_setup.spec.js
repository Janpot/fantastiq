/* eslint-env mocha */

'use strict';

var Promise = require('bluebird');
Promise.config({ cancellation: true });

before(function () {
  Error.stackTraceLimit = Infinity;
  Promise.longStackTraces();
});
