var Fiber = require('fibers');

function wrap_promiser(_func, _promise_attr) {
  var func = _func;
  var promise_attr = _promise_attr;

  var wrapped = function() {
    var fiber = Fiber.current;
    // not in fiber. just call regular func
    if (!fiber) {
      return func.apply(this, arguments);
    }
    var promise = func.apply(this, arguments);
    if (promise_attr) {
      promise = promise[promise_attr];
    }
    var next = promise.then(function() {
      console.log(_func);
      //fiber.run.apply(this, arguments);
      fiber.run(arguments);
    });
    return Fiber.yield();
  };
  return wrapped;
}

module.exports.wrap_promiser = wrap_promiser;

function wrap_method(obj, meth_name, promise_attr) {
  var old_meth = obj[meth_name];
  var meth = wrap_promiser(old_meth, promise_attr);
  obj[meth_name] = meth;
}

module.exports.wrap_method = wrap_method;
