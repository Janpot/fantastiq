'use strict';

var express = require('express');
var fs = require('fs');
var bodyParser = require('body-parser');

function createApiRouter(queue) {

  var apiRouter = express.Router();

  function serialize(job) {
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


  apiRouter.post('/jobs', bodyParser.json({ strict: false, type: '*/*' }));
  apiRouter.post('/jobs', function (req, res, next) {
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
      'failed'
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

  return apiRouter;
}


function create(queue) {
  var router = express.Router();

  router.use('/', express.static(__dirname + '/app', { index: false }));

  router.get('/', function (req, res, next) {
    if (!req.accepts('html') || req.xhr) {
      return next();
    }

    var indexPath = __dirname + '/app/index.html';
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
