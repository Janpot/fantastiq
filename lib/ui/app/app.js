import angular from 'angular';
import jobList from './components/jobList/jobList';
import stats from './components/stats/stats';
import addJobButton from './components/addJobButton/addJobButton';
import configButton from './components/configButton/configButton';
import queue from './services/queue';

export default angular.module('fantastiq.app', [
  jobList.name,
  stats.name,
  addJobButton.name,
  configButton.name,
  queue.name
])
  .config(function ($routeProvider) {
    $routeProvider.when('/', {
      template: '<stats metrics="$resolve.metrics" layout-fill />',
      resolve: {
        metrics: (queue) => queue.metrics()
      }
    });
    $routeProvider.when('/:state', {
      template: '<job-list list="$resolve.list" layout-fill />',
      resolve: {
        list: function ($route, queue) {
          var routeParams = $route.current.params;
          var rangeOptions = {
            fill: true
          };

          if (routeParams.before) {
            rangeOptions.end = routeParams.before;
          } else if (routeParams.after) {
            rangeOptions.start = routeParams.after;
          }

          return queue.list(routeParams.state, rangeOptions)
            .then(function (res) {
              return res.data.jobs;
            });
        }
      }
    });
  })
  .component('app', {
    templateUrl: 'app/app.html',
    controller: function ($timeout, $mdSidenav, $location, queue) {
      this.stats = {};

      this.showJobs = function (state) {
        $location.path('/' + state).search('before', null).search('after', null);
        $mdSidenav('left').toggle();
      };

      var updateStats = () => {
        return queue.stat()
          .then(res => {
            angular.copy(res, this.stats);
          }, err => {
            console.error(err);
          });
      };

      (function tick () {
        updateStats().finally(() => $timeout(tick, 1000));
      }());
    }
  });
