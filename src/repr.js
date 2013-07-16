var inspect = require('util').inspect

// assume we always want color
var default_writer = function(obj, showHidden, depth) {
  return inspect(obj, showHidden, depth, true);
};

// http://stackoverflow.com/a/7356528/1297165
function isFunction(functionToCheck) {
 var getType = {};
 return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

module.exports.repr = function(obj, opts) {
  if (obj && isFunction(obj.__repr__)) {
    return obj.__repr__();
  }
  if (obj && typeof(obj.__repr__) == 'string') {
      return obj.__repr__;
  }
  return default_writer(obj, opts);
}
