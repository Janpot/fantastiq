import angular from 'angular';
import bluebird from 'bluebird';
import angularRoute from 'angular-route';
import angularSanitize from 'angular-sanitize';
import angularMaterial from 'angular-material';
import app from './app/app';

angular.module('fantastiq', [
  angularRoute,
  angularMaterial,
  angularSanitize,
  app.name
])
  .run(function ($rootScope) {
    bluebird.setScheduler(function (cb) {
      $rootScope.$evalAsync(cb);
    });
  })
  .config(function ($httpProvider, $mdThemingProvider) {
    $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

    $mdThemingProvider.theme('default')
      .primaryPalette('teal')
      .accentPalette('blue-grey');
  });
