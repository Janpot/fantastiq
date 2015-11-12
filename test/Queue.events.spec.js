'use strict';
var { EventEmitter } = require('events');
var assert = require('chai').assert;

module.exports = function (queue) {
  return function () {
    it('should be an event emitter', function () {
      assert.instanceOf(queue, EventEmitter);
    });
  };
};
