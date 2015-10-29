'use strict';

var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');
var path = require('path');

function createApiRouter(queue) {

  var apiRouter = new express.Router();

  var jsonBodyParser = bodyParser.json({ strict: false, type: '*/*' });

  function serialize(job) {
    if (!job) {
      return null;
    }
    if (job.error) {
      job.error = {
        message: job.error.message,
        stack: job.error.stack
      };
    }
    return job;
  }

  apiRouter.get('/', function (req, res, next) {
    queue.stat()
      .then(function (stats) {
        res.json(stats);
      })
      .catch(next);
  });

  apiRouter.get('/jobs/:id', function (req, res, next) {
    queue.get(req.params.id)
      .then(function (job) {
        if (job) {
          res.json(serialize(job));
        } else {
          res.status(404).end();
        }
      })
      .catch(next);
  });


  apiRouter.post('/jobs', jsonBodyParser, function (req, res, next) {
    queue.add(req.body, req.query)
      .then(function (id) {
        return queue.get(id);
      })
      .then(function (job) {
        if (job) {
          res.json(serialize(job));
        } else {
          throw new Error('Failed to add job');
        }
      })
      .catch(next);
  });

  apiRouter.get('/:state', function (req, res, next) {
    var isState = [
      'inactive',
      'active',
      'completed',
      'failed',
      'delayed'
    ].indexOf(req.params.state) >= 0;

    if (!isState) {
      return next();
    }

    var count = req.query.count || 10;
    var start = null;
    var order = 'asc';

    if (req.query.start) {
      start = req.query.start;
    } else if (req.query.end) {
      start = req.query.end;
      order = 'desc';
    }

    queue.range(req.params.state, {
      count: count,
      order: order,
      start: start
    })
      .then(function (ids) {
        if (ids.length < count) {
          order = order === 'asc' ? 'desc' : 'asc';
          return queue.range(req.params.state, {
            count: count,
            order: order
          });
        } else {
          return ids;
        }
      })
      .then(function (ids) {
        if (order === 'desc') {
          ids = ids.reverse();
        }
        return queue.getN(ids);
      })
      .then(function (jobs) {
        res.json({
          jobs: jobs.map(serialize)
        });
      })
      .catch(next);
  });

  apiRouter.get('/metrics', function (req, res, next) {
    queue.metrics()
      .then(function (metrics) {
        res.json(metrics);
      })
      .catch(next);
  });



  apiRouter.delete('/jobs/:id', function (req, res, next) {
    queue.remove(req.params.id)
      .then(function (removeCount) {
        if (removeCount > 0) {
          res.status(200);
        } else {
          res.status(404);
        }
        res.end();
      })
      .catch(next);
  });


  apiRouter.post('/retrieval', jsonBodyParser, function (req, res, next) {
    queue.retrieve(req.body)
      .then(function (result) {
        res.json(result);
      })
      .catch(next);
  });


  apiRouter.delete('/retrieval/:id', jsonBodyParser, function (req, res, next) {
    var error = req.body.error || null;
    var result = error ? null : req.body.result || null;
    queue.acknowledge(req.params.id, error, result)
      .then(function (job) {
        if (job.error) {
          job.error = {
            message: job.error.message,
            stack: job.error.stack
          };
        }
        res.json(result);
      })
      .catch(next);
  });


  apiRouter.post('/config', jsonBodyParser, function (req, res, next) {
    queue.config(req.body)
      .then(function (config) {
        res.json(config);
      })
      .catch(next);
  });


  apiRouter.get('/config', function (req, res, next) {
    queue.config()
      .then(function (config) {
        res.json(config);
      })
      .catch(next);
  });

  return apiRouter;
}


function create(queue) {
  var router = new express.Router();

  router.use('/', express.static(path.resolve(__dirname, './app'), {
    index: false
  }));

  router.get('/', function (req, res, next) {
    if (!req.accepts('html') || req.xhr) {
      return next();
    }

    var indexPath = path.resolve(__dirname, './app/index.html');
    fs.readFile(indexPath, { encoding: 'utf-8' }, function (err, index) {
      if (err) {
        return next(err);
      }
      res.send(index.replace('__CONFIG__', JSON.stringify({
        baseUrl: req.baseUrl
      })));
    });
  });

  router.use('/', createApiRouter(queue));

  return router;
}

module.exports.api = createApiRouter;
module.exports.ui = create;
