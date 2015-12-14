import angular from 'angular';

export default angular.module('fantastiq.jobDetailsDialog', [])
  .value('jobDetailsDialog', jobDetailsDialog);

function jobDetailsDialog (options) {
  return {
    templateUrl: 'app/components/jobDetailsDialog/jobDetailsDialog.html',
    resolve: {
      props: function () {
        return options.job;
      }
    },
    controller: function ($mdDialog, $route, queue) {
      this.close = () => $mdDialog.hide();

      this.remove = () => {
        return queue.remove(this.props.id)
          .then(this.close)
          .then(() => $route.reload());
      };
    },
    bindToController: true,
    controllerAs: 'jobDetailsDialog',
    targetEvent: options.targetEvent,
    clickOutsideToClose: true
  };
}
