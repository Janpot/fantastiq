import angular from 'angular';
import Highcharts from 'highcharts';

export default angular.module('fantastiq.highchart', [])
  .directive('highchart', function ($timeout) {
    Highcharts.setOptions({
      global: {
        useUTC: false
      },
      chart: {
        style: {
          fontFamily: 'RobotoDraft, Roboto, \'Helvetica Neue\', sans-serif'
        }
      }
    });

    function link (scope, element, attrs) {
      var container = angular.element('<div>');
      element.css({
        margin: '15px'
      });
      element.append(container);

      scope.$watch('series', function (newValue) {
        if (!newValue) {
          return;
        }

        $timeout(function () {
          return new Highcharts.Chart({ // eslint-disable-line no-new
            chart: {
              renderTo: container[0],
              height: 250
            },
            title: {
              text: attrs.title
            },
            series: newValue,
            xAxis: {
              type: 'datetime',
              minRange: 60 * 60 * 1000,
              ceiling: Date.now()
            },
            yAxis: {
              gridLineWidth: 0,
              floor: 0,
              title: {
                text: null
              }
            },
            plotOptions: {
              line: {
                animation: false,
                marker: {
                  enabled: false
                }
              }
            }
          });
        }, 0);
      });
    }

    return {
      restrict: 'E',
      scope: {
        series: '='
      },
      template: '<div ng-non-bindable></div>',
      link: link
    };
  });
