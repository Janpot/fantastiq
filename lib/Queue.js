'use strict';

var Promise = require('bluebird');
var redisScripts = require('then-redis-scripts');
var passkey = require('passkey');
var path = require('path');
var router = require('./router');
var Worker = require('./Worker');
var metrics = require('./metrics');
var redisInfo = require('redis-info');
var jobUtils = require('./jobUtils');
var extend = require('extend');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var redis = require('redis');
var IntervalWorker = require('./IntervalWorker');

var METRICS_CYCLE_TIME = 60 * 1000;
var METRICS_RETENTION_TIME = 60 * 60 * 1000;
var DEFAULT_TIMEOUT = 30000;

function createClient (redisOpts) {
  if (redisOpts instanceof redis.RedisClient) {
    return redisOpts.duplicate();
  } else {
    return redis.createClient(redisOpts);
  }
}

function Queue (prefix, redisOpts) {
  EventEmitter.call(this);
  this._prefix = prefix;
  this._client = createClient(redisOpts);
  this._client.on('error', function (err) {
    this.emit('error', err);
  }.bind(this));
  this._scripts = redisScripts(this._client, {
    base: path.resolve(__dirname, 'lua'),
    shared: {
      path: 'fantastiq',
      keys: [
        this._key('inactive'),
        this._key('active'),
        this._key('failed'),
        this._key('completed'),
        this._key('delayed'),
        this._key('job-details'),
        this._key('config'),
        this._key('job-updated-events')
      ]
    }
  });
  this._passkey = passkey(this._client);
  this._metrics = metrics(this._client, {
    retainFor: METRICS_RETENTION_TIME
  });
  this._maintenanceCycles = [];
  this._pubSubClient;
  this.once('newListener', function () {
    this._pubSubClient = createClient(redisOpts);
    this._pubSubClient.on('error', function (err) {
      this.emit('error', err);
    }.bind(this));
    this._pubSubClient.on('message', function (channel, event) {
      this.emit('jobUpdate', JSON.parse(event));
    }.bind(this));
    this._pubSubClient.subscribe(this._key('job-updated-events'));
  }.bind(this));
  this._setupMaintenanceCycles();
}
util.inherits(Queue, EventEmitter);

Queue.prototype.quit = function () {
  return this._stopMaintenanceCycles()
    .bind(this)
    .then(function () {
      var quitClientPromise = Promise.fromCallback(this._client.quit.bind(this._client));
      var quitPubSubClientPromise;
      if (this._pubSubClient) {
        quitPubSubClientPromise = Promise.fromCallback(this._pubSubClient.unsubscribe.bind(this._pubSubClient))
          .then(function () {
            return Promise.fromCallback(this._pubSubClient.quit.bind(this._pubSubClient));
          }.bind(this));
      }
      return Promise.all([ quitClientPromise, quitPubSubClientPromise ]);
    })
    .return(null);
};

Queue.prototype._key = function (key) {
  return this._prefix + ':' + key;
};

Queue.prototype._receiveConfig = function (config) {
  config = config || {};
  var parsed = Object.keys(config).reduce(function (obj, key) {
    obj[key] = JSON.parse(config[key]);
    return obj;
  }, {});
  return extend({
    timeout: DEFAULT_TIMEOUT
  }, parsed);
};

Queue.prototype.config = function (config) {
  var multi = this._client.multi();

  if (config) {
    Object.keys(config)
      .forEach(function (key) {
        var value = config[key];
        if (value === null) {
          multi.hdel(this._key('config'), key);
        } else {
          multi.hset(this._key('config'), key, JSON.stringify(value));
        }
      }, this);
  }

  multi.hgetall(this._key('config'));

  return Promise.fromCallback(multi.exec.bind(multi))
    .call('pop')
    .bind(this)
    .then(this._receiveConfig);
};

Queue.prototype.get = function (id) {
  if (typeof id !== 'string') {
    return Promise.reject(
      new Error('.get is expected to be called with a string'));
  }
  return this.getN([id]).get(0);
};

Queue.prototype.getN = function (jobIds) {
  if (jobIds.length <= 0) {
    return Promise.resolve([]);
  }

  return this._scripts.run('getJob', [], [
    Date.now()
  ].concat(jobIds))
    .bind(this)
    .map(JSON.parse)
    .map(function (details) {
      if (details) {
        if (details.data) {
          details.data = JSON.parse(details.data);
        }
        if (details.result) {
          details.result = JSON.parse(details.result);
        }
        if (details.error) {
          details.error = jobUtils.parseError(details.error);
        }
        return details;
      } else {
        return null;
      }
    });
};

Queue.prototype.add = function (job, options) {
  return this.addN([job], options).get(0);
};

Queue.prototype.addN = function (jobs, options) {
  options = options || {};
  if (!Array.isArray(jobs)) {
    return Promise.reject(new Error('.addN() expects an Array'));
  }
  var priority = options.priority || 0;
  var runAt = options.runAt || 0;
  return this._scripts.run('addJob', [
    this._key('next-id'),
    this._key('index')
  ], [
    Date.now(),
    priority,
    runAt
  ].concat(jobs.map(jobUtils.stringifyData, this)));
};

Queue.prototype.remove = function (id) {
  if (typeof id !== 'string') {
    return Promise.reject(
      new Error('.remove is expected to be called with a string'));
  }
  return this.removeN([id]);
};

Queue.prototype.removeN = function (jobIds) {
  if (jobIds.length <= 0) {
    return Promise.resolve(0);
  }
  return this._scripts.run('removeJob', [
    this._key('job-marked-for-del'),
    this._key('index')
  ], [
    Date.now()
  ].concat(jobIds));
};

Queue.prototype.retrieve = function (options) {
  options = options || {};
  return this._scripts.run('retrieveJob', [
    this._key('last-retrieve'),
    this._key('last-retrieve-id')
  ], [
    Date.now(),
    JSON.stringify(options.unthrottle || false),
    options.random ? Math.random() : 0
  ])
    .bind(this)
    .spread(function (jobIds, jobData, wait) {
      return {
        id: jobIds[0] || null,
        data: jobUtils.parseData(jobData),
        wait: Math.max(wait, 0)
      };
    });
};

Queue.prototype.acknowledge = function (jobId, error, result) {
  var rawError = jobUtils.stringifyError(error);
  var rawResult = jobUtils.stringifyData(result);

  return this._scripts.run('acknowledgeJob', [ this._key('index') ], [
    Date.now(),
    jobId,
    rawError,
    rawResult
  ])
    .return(jobId);
};

Queue.prototype.stat = function () {
  var multi = this._client.multi();
  multi.zcard(this._key('inactive'));
  multi.zcard(this._key('active'));
  multi.zcard(this._key('completed'));
  multi.zcard(this._key('failed'));
  multi.zcard(this._key('delayed'));
  return Promise.fromCallback(multi.exec.bind(multi))
    .then(function (results) {
      var total = results.reduce(function (a, b) { return a + b; });
      return {
        totalCount: total,
        inactiveCount: results[0],
        activeCount: results[1],
        completedCount: results[2],
        failedCount: results[3],
        delayedCount: results[4]
      };
    });
};

Queue.prototype._runTimeoutCycle = function (lockTime) {
  return Promise.resolve().bind(this)
    .then(function () {
      if (lockTime) {
        return this._passkey.lock(this._key('timeout-cycle-lock'), lockTime);
      }
    })
    .then(function () {
      var serializedError = jobUtils.stringifyError(new Error('Job timed out'));
      return this._scripts.run('timeoutCycle', [ this._key('index') ], [
        Date.now(),
        DEFAULT_TIMEOUT,
        serializedError
      ]);
    })
    .catch(passkey.LockError, function () {
      return 0;
    });
};

Queue.prototype._deleteMarkedJobs = function (lock, lockTime, cursor, total) {
  cursor = cursor || 0;
  total = total || 0;
  return Promise.resolve(lock)
    .bind(this)
    .then(function () {
      if (lock) {
        return lock.ttl(lockTime); // extend the lock
      }
    })
    .then(function () {
      return Promise.fromCallback(function (callback) {
        this._client.zscan(this._key('job-marked-for-del'), cursor, 'count', 100, callback);
      }.bind(this));
    })
    .spread(function (newCursor, zscanResult) {
      var jobIds = zscanResult.filter(function (job, index) {
        return index % 2 === 0;
      });
      return this.removeN(jobIds)
        .bind(this)
        .then(function (removedCount) {
          total += removedCount;
          if (parseInt(newCursor, 10) === 0) {
            return total;
          } else {
            return this._deleteMarkedJobs(lock, lockTime, newCursor, total);
          }
        });
    });
};

Queue.prototype._runCleanupCycle = function (lockTime) {
  return Promise.resolve().bind(this)
    .then(function () {
      if (lockTime) {
        return this._passkey.lock(this._key('cleanup-cycle-lock'), lockTime);
      }
    })
    .then(function (lock) {
      return this._scripts.run('cleanupCycle', [
        this._key('job-marked-for-del'),
        this._key('tmp')
      ], [
        Date.now()
      ])
        .bind(this)
        .then(function () {
          return this._deleteMarkedJobs(lock, lockTime);
        });
    })
    .catch(passkey.LockError, function () {
      return 0;
    });
};

Queue.prototype._runDelayedCycle = function (lockTime) {
  return Promise.resolve().bind(this)
    .then(function () {
      if (lockTime) {
        return this._passkey.lock(this._key('delayed-cycle-lock'), lockTime);
      }
    })
    .then(function () {
      return this._scripts.run('delayedCycle', [ this._key('tmp') ], [
        Date.now()
      ]);
    })
    .catch(passkey.LockError, function () {
      return 0;
    });
};

Queue.prototype._runMetricsCycle = function () {
  return this._passkey.lock(this._key('metrics-lock'), METRICS_CYCLE_TIME)
    .bind(this)
    .then(function () {
      return Promise.all([
        this.stat(),
        Promise.fromCallback(this._client.info.bind(this._client)).then(redisInfo.parse)
      ]);
    })
    .spread(function (stats, info) {
      return Promise.props({
        inactive: this._metrics.track(
          this._key('metric-inactive'), stats.inactiveCount),
        active: this._metrics.track(
          this._key('metric-active'), stats.activeCount),
        failed: this._metrics.track(
          this._key('metric-failed'), stats.failedCount),
        completed: this._metrics.track(
          this._key('metric-completed'), stats.completedCount),
        delayed: this._metrics.track(
          this._key('metric-delayed'), stats.delayedCount),
        usedMemory: this._metrics.track(
          this._key('metric-used-memory'), info.used_memory)
      });
    })
    .catch(passkey.LockError, function () {});
};

Queue.prototype._startMaintenanceCycle = function (method, time) {
  var queue = this;
  return new IntervalWorker(function () {
    return queue[method]()
      .catch(function (error) {
        queue.emit('error', error);
      });
  }, time);
};

Queue.prototype._setupMaintenanceCycles = function (time) {
  this._maintenanceCycles.push(this._startMaintenanceCycle('_runTimeoutCycle', time));
  this._maintenanceCycles.push(this._startMaintenanceCycle('_runCleanupCycle', time));
  this._maintenanceCycles.push(this._startMaintenanceCycle('_runDelayedCycle', time));
  this._maintenanceCycles.push(this._startMaintenanceCycle('_runMetricsCycle', time));
};

Queue.prototype._startMaintenanceCycles = function (time) {
  this._maintenanceCycles.forEach(function (worker) {
    worker.start();
  });
};

Queue.prototype._stopMaintenanceCycles = function (time) {
  return Promise.all(
    this._maintenanceCycles.map(function (worker) {
      return worker.stop();
    })
  );
};

Queue.prototype.metrics = function (start, end) {
  return Promise.props({
    jobs: Promise.all([
      Promise.props({
        name: 'Inactive',
        data: this._metrics.range(
          this._key('metric-inactive'), start, end)
      }),
      Promise.props({
        name: 'Active',
        data: this._metrics.range(
          this._key('metric-active'), start, end)
      }),
      Promise.props({
        name: 'Completed',
        data: this._metrics.range(
          this._key('metric-completed'), start, end)
      }),
      Promise.props({
        name: 'Failed',
        data: this._metrics.range(
          this._key('metric-failed'), start, end)
      }),
      Promise.props({
        name: 'Delayed',
        data: this._metrics.range(
          this._key('metric-delayed'), start, end)
      })
    ]),
    memory: Promise.all([
      Promise.props({
        name: 'Used',
        data: this._metrics.range(
          this._key('metric-used-memory'), start, end)
      })
    ])
  });
};

Queue.prototype.range = function (state, options) {
  options = options || {};
  var count = options.count || 10;
  var order = options.order === 'desc' ? 'desc' : 'asc';
  var start = options.start || '';
  return this._scripts.run('rangeJobs', [
    this._key(state)
  ], [ Date.now(), count, order, start ]);
};

Queue.prototype.process = function (doWorkFn, options) {
  var worker = new Worker(this, doWorkFn, options);
  worker.start();
  return worker;
};

Queue.prototype.api = function () {
  return router.api(this);
};

Queue.prototype.ui = function () {
  return router.ui(this);
};

module.exports = Queue;
