/*
 * Tools to wrap promise returning funcs with Fiber so that they are 
 * executed synchronously.
 *
 */
var Fiber = require('fibers');
var Q = require('q');

// monkey patched for we don't try to coerce our
// pseudo promise objects. Note this only works 
// q.version > 0.9.6
Q.isPromiseAlike = function() { return false; };

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
      return func.apply(self, arguments);
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
    deferred.resolve(res);
    // makes our res PromiseAlike. Make sure we're not coercing
    // with monkey patch above
    res.then = function() {
      return fake_then(res, arguments[0]);
    };
    return res
  };
  return wrapped;
}

function fake_then(res, fulfilled, rejected, progressed) {
  var val = fulfilled(res);
  return res;
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
  thisobj[meth_name] = sync_method;
}

module.exports.syncrify = syncrify;
