'use strict';

angular.module('fantastiq')
  .controller('JobsController', function ($routeParams, jobDetailsDialog, jobList) {
    var jobs = this;

    jobs.state = $routeParams.state;
    jobs.list = jobList;
    jobs.first = jobs.list[0];
    jobs.last = jobs.list[jobs.list.length - 1];

    jobs.showDetails = jobDetailsDialog.showJob;
  })
  .factory('jobDetailsDialog', function ($mdDialog, queue) {
    function showJob (job, $event) {
      return $mdDialog.show({
        templateUrl: 'jobs/job.html',
        controller: 'JobController',
        controllerAs: 'job',
        targetEvent: $event,
        locals: { jobProperties: job },
        clickOutsideToClose: true
      });
    }

    function showJobById (id, $event) {
      return queue.get(id)
        .then(function (job) {
          return showJob(job, $event);
        });
    }

    return {
      showJob: showJob,
      showJobById: showJobById
    };
  })
  .controller('JobController', function ($mdDialog, $route, jobProperties, queue) {
    var job = this;

    job.props = jobProperties;

    job.close = function () {
      $mdDialog.hide();
    };

    job.remove = function () {
      queue.remove(job.props.id)
        .then(function () {
          $mdDialog.hide();
          $route.reload();
        });
    };
  });
