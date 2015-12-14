import angular from 'angular';
import highchart from '../highchart/highchart';
import menuButton from '../menuButton/menuButton';
import queue from '../../services/queue';

export default angular.module('fantastiq.stats', [
  highchart.name,
  menuButton.name,
  queue.name
])
  .component('stats', {
    templateUrl: 'app/components/stats/stats.html',
    bindings: {
      metrics: '='
    }
  });
