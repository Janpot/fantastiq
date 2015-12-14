import angular from 'angular';

export default angular.module('fantastiq.configDialog', [])
  .value('configDialog', function (options) {
    return {
      templateUrl: 'app/components/configDialog/configDialog.html',
      resolve: {
        values: function (queue) {
          return options.values || queue.config();
        }
      },
      controller: function ($mdDialog, queue) {
        this.editable = angular.copy(this.values);

        this.close = $mdDialog.hide;

        this.isOriginal = () => angular.equals(this.editable, this.values);

        this.reset = () => {
          this.editable = angular.copy(this.values);
        };

        this.apply = () => queue.config(this.editable).then($mdDialog.hide);
      },
      controllerAs: 'configDialog',
      bindToController: true,
      targetEvent: options.targetEvent,
      clickOutsideToClose: true
    };
  });
