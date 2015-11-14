'use strict';

var Promise = require('bluebird');

Error.stackTraceLimit = Infinity;
Promise.longStackTraces();

require('babel-polyfill');
require('babel-register')({
  presets: ['es2015']
});
