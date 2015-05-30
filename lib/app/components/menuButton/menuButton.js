angular.module('fantastiq.components')
  .directive('menuButton', function () {
    return {
      scope: {},
      replace: true,
      controller: 'MenuButtonCtrl',
      template: '<span><md-button hide-gt-md ng-click="toggle()" class="md-icon-button"><i class="material-icons">menu</i></md-button></span>'
    };
  })
  .controller('MenuButtonCtrl', function ($scope, $mdSidenav) {
    $scope.toggle = function () {
      $mdSidenav('left').toggle();
    };
  });
