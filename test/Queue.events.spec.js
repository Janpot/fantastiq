/* eslint-env mocha */

'use strict';

var { EventEmitter } = require('events');
var assert = require('chai').assert;
var Promise = require('bluebird');

function captureEvents (emitter, event, count) {
  return new Promise(function (resolve, reject) {
    var events = [];
    var i = 0;
    function listener (event) {
      events.push(event);
      i += 1;
      if (i >= count) {
        emitter.removeListener(event, listener);
        return resolve(events);
      }
    }
    emitter.on(event, listener);
  });
}

module.exports = function (createQueue) {
  return function () {
    it('should be an event emitter', function () {
      assert.instanceOf(createQueue(), EventEmitter);
    });

    it('should emit normal lifecycle events', function () {
      var queue = createQueue();
      var ids;
      var eventsPromise = captureEvents(queue, 'jobUpdate', 7);

      queue._pubSubClient.on('subscribe', function () {
        queue.addN([1, 2])
          .then(function (_ids) {
            ids = _ids;
            return queue.retrieve();
          })
          .then(function (result) {
            return queue.acknowledge(result.id);
          })
          .then(function () {
            return queue.retrieve();
          })
          .then(function (result) {
            return queue.acknowledge(result.id, new Error('error'));
          })
          .then(function (result) {
            return queue.remove(ids[1]);
          });
      });

      return eventsPromise.then(function (events) {
        assert.strictEqual(events[0].id, ids[0]);
        assert.notOk(events[0].oldState);
        assert.strictEqual(events[0].newState, 'inactive');
        assert.strictEqual(events[1].id, ids[1]);
        assert.notOk(events[1].oldState);
        assert.strictEqual(events[1].newState, 'inactive');
        assert.strictEqual(events[2].id, ids[0]);
        assert.strictEqual(events[2].oldState, 'inactive');
        assert.strictEqual(events[2].newState, 'active');
        assert.strictEqual(events[3].id, ids[0]);
        assert.strictEqual(events[3].oldState, 'active');
        assert.strictEqual(events[3].newState, 'completed');
        assert.strictEqual(events[4].id, ids[1]);
        assert.strictEqual(events[4].oldState, 'inactive');
        assert.strictEqual(events[4].newState, 'active');
        assert.strictEqual(events[5].id, ids[1]);
        assert.strictEqual(events[5].oldState, 'active');
        assert.strictEqual(events[5].newState, 'failed');
        assert.strictEqual(events[6].id, ids[1]);
        assert.strictEqual(events[6].oldState, 'failed');
        assert.notOk(events[6].newState);
      });
    });

    it('should emit events on other instances as well', function (done) {
      var queue1 = createQueue();
      var queue2 = createQueue();

      var eventsPromise = captureEvents(queue1, 'jobUpdate', 1);
      queue1._pubSubClient.on('subscribe', function () {
        return Promise.all([
          eventsPromise,
          queue2.add(1)
        ])
          .spread(function (events, id) {
            assert.strictEqual(events[0].id, id);
            assert.strictEqual(events[0].newState, 'inactive');
          })
          .asCallback(done);
      });
    });
  };
};
