'use strict';

angular.module('fantastiq')
  .controller('StatsController', function (metrics) {
    this.metrics = metrics;
  });
