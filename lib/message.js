'use strict';

function parse (string) {
  if (typeof string === 'object') {
    string = JSON.stringify(string);
  }
  return JSON.parse(string, function (k, v) {
    if (typeof v === 'string') {
      var match = /([^:]*):([^]*)/.exec(v);
      if (!match) {
        return v;
      } else if (match[1] === 'Error') {
        var params = JSON.parse(match[2]);
        var error = new Error(params.message);
        error.stack = params.stack;
        return error;
      } else {
        return match[2];
      }
    } else {
      return v;
    }
  });
}

function stringify (json) {
  if (typeof json === 'string') {
    json = JSON.parse(json);
  }
  return JSON.stringify(json, function (k, v) {
    if (typeof v === 'string') {
      return ':' + v;
    } else if (v instanceof Error) {
      return 'Error:' + JSON.stringify({
        message: v.message,
        stack: v.stack
      });
    } else {
      return v;
    }
  });
}

module.exports = {
  parse: parse,
  stringify: stringify
};
