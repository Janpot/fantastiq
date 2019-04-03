#! /usr/bin/env node

'use strict';

var fantastiq = require('..');
var Promise = require('bluebird');
var split = require('split');
var BatchStream = require('batch-stream');
var stream = require('readable-stream');
var joinStream = require('join-stream');

var redis = require('redis');
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

Promise.longStackTraces();

var optionRedis = {
  alias: 'redis',
  default: 'tcp://localhost:6379',
  describe: 'Redis connection',
  type: 'string'
};

function parseJob (raw) {
  try {
    return JSON.parse(raw);
  } catch (e) {
    return String(raw);
  }
}

function createQueue (connectionParams) {
  var queue = fantastiq.client(connectionParams);
  return Promise.resolve(queue).disposer(function (toDispose) {
    return toDispose.quit();
  });
}

module.exports = require('yargs')
  .usage('$0 <command> [options]')
  .option('r', optionRedis)
  .command('add', 'Add a job to the queue', function (yargs) {
    var argv = yargs
      .usage('$0 add [options]')
      .example('$0 add -p 5 -j job-1 -j job-2')
      .example('cat ./jobs.txt | $0 add -p="-1"')
      .option('r', optionRedis)
      .option('j', {
        alias: 'job',
        describe: 'Job to add',
        type: 'string'
      })
      .option('b', {
        alias: 'batch',
        describe: 'Batch size',
        default: 100
      })
      .option('p', {
        alias: 'priority',
        describe: 'Job priority, lower numbers are processed first',
        default: 0
      })
      .help('h')
      .alias('h', 'help')
      .argv;

    var jobs = null;
    if (typeof argv.j === 'string') {
      jobs = [argv.j];
    } else if (Array.isArray(argv.j)) {
      jobs = argv.j;
    }

    var options = {
      priority: argv.priority || 0
    };

    return Promise.using(createQueue(argv.redis), function (queue) {
      return Promise.fromCallback(function (callback) {
        var jobStream;

        if (jobs) {
          jobStream = new stream.Readable({
            objectMode: true,
            read: function () {
              var nextJob = jobs.length > 0 ? parseJob(jobs.shift()) : null;
              this.push(nextJob);
            }
          });
        } else {
          // read from stdin
          jobStream = process.stdin.pipe(split(null, parseJob));
        }

        var result = jobStream
          .pipe(new BatchStream({ size: argv.batch }))
          .pipe(new stream.Transform({
            objectMode: true,
            transform: function (jobBatch, encoding, next) {
              queue.addN(jobBatch, options)
                .then(function (ids) {
                  next(null, ids.join('\n'));
                })
                .catch(next);
            }
          }))
          .on('error', callback)
          .pipe(joinStream('\n'));

        result.pipe(process.stdout);

        result
          .on('error', callback)
          .on('end', function () {
            callback();
          });
      });
    });
  })
  .command('get', 'Get a job from the queue', function (yargs) {
    var argv = yargs
      .usage('$0 get <id>')
      .example('$0 get 0000000000F9B')
      .string('_')
      .demand(1)
      .option('r', optionRedis)
      .argv;

    var id = argv._[1];

    return Promise.using(createQueue(argv.redis), function (queue) {
      return queue.get(id)
        .then(function (job) {
          return console.log(JSON.stringify(job, null, 2));
        });
    });
  })
  .help('h')
  .alias('h', 'help')
  .argv;
