var Fiber = require('fibers');
var Q = require('q');

function wrap_promiser(_func, config) {
  // local ns
  var func = _func;
  var promise_attr = config.promise_attr;
  var self = config.ctx;
  var fname = config.fname;

  var wrapped = function() {
    var fiber = Fiber.current;
    if ('undefined' === typeof(self)) {
      self = this;
    }

    if (!fiber) {
      var err_msg = "promise-sync funtions must be called from within a Fiber()";
      if (fname) {
        err_msg += "\nfname: "+fname;
      }
      throw err_msg;
    }
    var promise = func.apply(self, arguments);
    if (promise_attr) {
      promise = promise[promise_attr];
    }
    var next = promise.then(function() {
      // a promise can only resolve witha single variable
      fiber.run(arguments[0]);
    });
    var res = Fiber.yield();
    var deferred = Q.defer();
    if (typeof(res) === 'undefined') {
      res = deferred;
      res.resolve();
      return res.promise;
    }
    // make res act like a promise with then
    res.promise = deferred.promise;
    // Note. We have to resolve before we add then to res.
    // resolve will try to coerce objects with then into
    // a promise, which we don't want.
    deferred.resolve(res);
    res.then = function() { 
      return this.promise.then.apply(this.promise, arguments);
    };
    return res
  };
  return wrapped;
}

module.exports.wrap_promiser = wrap_promiser;

function wrap_method(obj, meth_name, promise_attr) {
  var old_meth = obj[meth_name];
  var config = {promise_attr:promise_attr, 'fname': meth_name}
  var meth = wrap_promiser(old_meth, config);
  obj[meth_name] = meth;
}

module.exports.wrap_method = wrap_method;

function syncrify(thisobj, meth_name, promise_attr) {
  var meth = thisobj[meth_name];
  var config = {promise_attr:promise_attr, ctx:thisobj, 'fname': meth_name}
  var sync_method = wrap_promiser(meth, config);
  meth.sync = sync_method;
}

module.exports.syncrify = syncrify;
