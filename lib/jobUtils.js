'use strict';

function stringifyData (data) {
  if (data === undefined) {
    // we treat undefined as null
    data = null;
  }
  return JSON.stringify(data);
}

function stringifyError (error) {
  if (!error) {
    return null;
  }
  return JSON.stringify({
    message: error.message,
    stack: error.stack
  });
}

function parseData (data, dflt) {
  if (data === undefined || data === null) {
    return dflt === undefined ? null : dflt;
  }
  return JSON.parse(data);
}

function parseError (error) {
  var parsed;
  if (typeof error === 'string') {
    parsed = parseData(error);
  } else {
    parsed = error;
  }
  if (!parsed) {
    return null;
  }
  var errObj = new Error(parsed.message);
  errObj.stack = parsed.stack;
  return errObj;
}

module.exports = {
  stringifyData: stringifyData,
  stringifyError: stringifyError,
  parseData: parseData,
  parseError: parseError
};
