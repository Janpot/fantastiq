'use strict';

var Promise = require('bluebird');
var redisScripts = require('then-redis-scripts');
var passkey = require('passkey');
var path = require('path');
var router = require('./router');
var Worker = require('./Worker');
var defaults = require('defaults');
var metrics = require('./metrics');

var METRICS_CYCLE_TIME = 60 * 1000;
var METRICS_RETENTION_TIME = 60 * 60 * 1000;
var DEFAULT_TIMEOUT = 30000;


function Queue(prefix, client) {
  this._prefix = prefix;
  this._client = client;
  this._scripts = redisScripts(this._client, {
    base: path.resolve(__dirname, 'lua'),
    shared: 'fantastiq'
  });
  this._passkey = passkey(this._client);
  this._metrics = metrics(this._client, {
    retainFor: METRICS_RETENTION_TIME
  });
}

Queue.prototype._key = function (key) {
  return this._prefix + ':' + key;
};

Queue.prototype._stringifyData = function (data) {
  if (data === undefined) {
    // we treat undefined as null
    data = null;
  }
  return JSON.stringify(data);
};

Queue.prototype._stringifyError = function (error) {
  if (!error) {
    return null;
  }
  return JSON.stringify({
    message: error.message,
    stack: error.stack
  });
};

Queue.prototype._parseData = function (data, dflt) {
  if (data === undefined || data === null) {
    return dflt === undefined ? null : dflt;
  }
  return JSON.parse(data);
};

Queue.prototype._parseError = function (error) {
  var parsed = this._parseData(error);
  if (!parsed) {
    return null;
  }
  var errObj = new Error(parsed.message);
  errObj.stack = parsed.stack;
  return errObj;
};

Queue.prototype._receiveConfig = function (config) {
  var parsed = {};
  for (var i = 0; i < config.length; i += 2) {
    var key = config[i];
    var value = config[i + 1];
    parsed[key] = Number(value);
  }
  return defaults(parsed, {
    timeout: DEFAULT_TIMEOUT
  });
};

Queue.prototype.config = function (config) {
  this._client.multi();

  if (config) {
    Object.keys(config)
      .forEach(function (key) {
        var value = config[key];
        if (value === null) {
          this._client.hdel(this._key('config'), key);
        } else {
          this._client.hset(this._key('config'), key, value);
        }
      }, this);
    }

  this._client.hgetall(this._key('config'));

  return this._client.exec()
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

  return this._scripts.run('getJob', [
    this._key('job-details')
  ], [
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
          details.error = this._parseError(details.error);
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
    this._key('inactive'),
    this._key('delayed'),
    this._key('job-details')
  ], [
    Date.now(),
    priority,
    runAt
  ].concat(jobs.map(this._stringifyData, this)));
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
    this._key('inactive'),
    this._key('active'),
    this._key('completed'),
    this._key('failed'),
    this._key('delayed'),
    this._key('job-marked-for-del'),
    this._key('job-details')
  ], [
    Date.now()
  ].concat(jobIds));
};

Queue.prototype.retrieve = function (options) {
  options = options || {};
  return this._scripts.run('retrieveJob', [
    this._key('inactive'),
    this._key('active'),
    this._key('config'),
    this._key('last-retrieve'),
    this._key('job-details')
  ], [
    Date.now(),
    !!options.unthrottle
  ])
    .bind(this)
    .spread(function (jobIds, jobData, wait) {
      return {
        id: jobIds[0] || null,
        data: this._parseData(jobData),
        wait: Math.max(wait, 0)
      };
    });
};

Queue.prototype.acknowledge = function (jobId, error, result) {
  var rawError = this._stringifyError(error);
  var rawResult = this._stringifyData(result);

  return this._scripts.run('acknowledgeJob', [
    this._key('inactive'),
    this._key('active'),
    this._key('failed'),
    this._key('completed'),
    this._key('delayed'),
    this._key('job-details'),
    this._key('config')
  ], [
    Date.now(),
    jobId,
    rawError,
    rawResult
  ])
    .return(jobId);
};

Queue.prototype.stat = function () {
  this._client.multi();
  this._client.zcard(this._key('inactive'));
  this._client.zcard(this._key('active'));
  this._client.zcard(this._key('completed'));
  this._client.zcard(this._key('failed'));
  this._client.zcard(this._key('delayed'));
  return this._client.exec()
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
  return Promise.resolve(lockTime)
    .bind(this)
    .then(function (lockTime) {
      if (lockTime) {
        return this._passkey.lock(this._key('timeout-cycle-lock'), lockTime);
      }
    })
    .then(function () {
      return this._scripts.run('timeoutCycle', [
        this._key('inactive'),
        this._key('active'),
        this._key('failed'),
        this._key('delayed'),
        this._key('job-details'),
        this._key('config')
      ], [ Date.now(), DEFAULT_TIMEOUT ]);
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
      return this._client.zscan(this._key('job-marked-for-del'), cursor, 'count', 100);
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
  return Promise.resolve(lockTime)
    .bind(this)
    .then(function (lockTime) {
      if (lockTime) {
        return this._passkey.lock(this._key('cleanup-cycle-lock'), lockTime);
      }
    })
    .then(function (lock) {
      return this._scripts.run('cleanupCycle', [
        this._key('job-marked-for-del'),
        this._key('failed'),
        this._key('completed'),
        this._key('tmp'),
        this._key('config')
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
  return Promise.resolve(lockTime)
    .bind(this)
    .then(function (lockTime) {
      if (lockTime) {
        return this._passkey.lock(this._key('delayed-cycle-lock'), lockTime);
      }
    })
    .then(function () {
      return this._scripts.run('delayedCycle', [
        this._key('delayed'),
        this._key('inactive'),
        this._key('job-details'),
        this._key('tmp')
      ], [
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
        this._client.info()
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
          this._key('metric-used-memory'), info.used_memory),
      });
    })
    .catch(passkey.LockError, function () {});
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
  return new Worker(this, doWorkFn, options).start();
};

Queue.prototype.api = function () {
  return router.api(this);
};

Queue.prototype.ui = function () {
  return router.ui(this);
};

module.exports = Queue;
