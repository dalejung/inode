var Q = require('q');

var IPython = require('./ipython.js').IPython
var IPythonBridge = require('./ipython.js').IPythonBridge

module.exports.ipy_kernel = function (base_url, notebook_id, config) {
  return new IPythonBridge(base_url, notebook_id, config);
}

