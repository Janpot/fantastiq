'use strict';

function idToDataFrom(queue) {
  return function (id) {
    return queue.get(id)
      .then(function (job) {
        return job.data;
      });
  };
}

exports.idToDataFrom = idToDataFrom;
