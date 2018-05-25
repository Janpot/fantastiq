import angular from 'angular';
import jobDetailsDialog from '../jobDetailsDialog/jobDetailsDialog';
import menuButton from '../menuButton/menuButton';
import queue from '../../services/queue';

export default angular.module('fantastiq.jobList', [
  jobDetailsDialog.name,
  menuButton.name,
  queue.name
])
  .component('jobList', {
    templateUrl: 'app/components/jobList/jobList.html',
    bindings: {
      list: '='
    },
    controller: function Ctrl ($mdDialog, $routeParams, jobDetailsDialog) {
      this.state = $routeParams.state;
      this.first = null;
      this.last = null;

      this.$onInit = function () {
        this.first = this.list[0];
        this.last = this.list[this.list.length - 1];
      };

      this.showDetails = (job, $event) => {
        $mdDialog.show(jobDetailsDialog({
          targetEvent: $event,
          job: job
        }));
      };
    }
  });
