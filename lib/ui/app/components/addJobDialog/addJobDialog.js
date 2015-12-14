import angular from 'angular';
import addJobToast from '../addJobToast/addJobToast';

export default angular.module('fantastiq.addJobDialog', [
  addJobToast.name
])
  .value('addJobDialog', function (options) {
    return {
      templateUrl: 'app/components/addJobDialog/addJobDialog.html',
      controller: function ($mdDialog, $mdToast, queue, addJobToast) {
        this.data = '';
        this.options = {
          priority: 0
        };

        this.close = $mdDialog.hide;

        this.apply = () => {
          return queue.add(this.data, this.options)
            .then(id => {
              $mdToast.show(addJobToast({ id: id }));
            })
            .then($mdDialog.hide);
        };
      },
      controllerAs: 'addJobDialog',
      targetEvent: options.targetEvent,
      clickOutsideToClose: true
    };
  });
