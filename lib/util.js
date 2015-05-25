'use strict';

function toArray(arrayLike) {
  var result = [];
  for (var i = 0; i < arrayLike.length; i++) {
    result.push(arrayLike[i]);
  }
  return result;
}

exports.toArray = toArray;
