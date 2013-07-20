var repl = require('repl');
var vm = require('vm')
var inherits = require('util').inherits;
var Q = require('q');
var Fiber = require('fibers');

function InodeREPLServer(prompt, source, eval_, useGlobal, ignoreUndefined) {
  repl.REPLServer.call(this, prompt, source, eval_, useGlobal, ignoreUndefined);

  this.magics = [];
  this.eval = fiber_eval;
  this.inode_eval = inode_eval;
  this.inner_eval = inner_eval;
}

inherits(InodeREPLServer, repl.REPLServer);
exports.InodeREPLServer = InodeREPLServer;

InodeREPLServer.prototype.install_magic = function(magic) {
  this.magics.push(magic);
}

InodeREPLServer.prototype.run = function(code) {
    /*
     * Run code as if it was placed in REPL input
     */
    // wrap code to mimic repl wrapped
    code = '('+code+'\n)';
    // skip inode_eval since we don't need callback handling
    return this.inner_eval(code, this.context);      
}

function inner_eval(code, context, file) {
  // remove parens and newline
  var bare_code = code.substr(1, code.length-3);
  // attempt to get a result from each magic
  var result; 
  for (var i = 0; i < this.magics.length; i++) {
    var magic = this.magics[i];
    var result = magic.eval(bare_code, context);
    if (typeof(result) !== 'undefined') {
      return result;
    }
  }

  if (context === global) {
    throw "We do not support global repl";
  } 
  result = vm.runInContext(code, context, file);

  return result;
}

var fiber_eval = function(code, context, file, cb) {
  var self = this;
  Fiber(function() {
    self.inode_eval(code, context, file, cb);
  }).run();
}

var inode_eval = function(code, context, file, cb) {
  var err, result;
  try {
    result = inner_eval.call(this, code, context, file);
  } catch (e) {
    err = e;
  }
  if (err && process.domain && !isSyntaxError(err)) {
    process.domain.emit('error', err);
    process.domain.exit();
  }
  else {
    if (Q.isPromise(result) && result.pause_repl) {
      this.rli.pause();
      result.then(function(data) {
        result.pause_repl = false; // only pause repl once
        cb(err, data);
      }).catch(function(error) { 
        cb(error, data)
      });
    }
    else 
    {
      cb(err, result);
    }
  }

  // save me obi-wan
  var self = this;
  setTimeout(function() {self.rli.resume()}, 5000);
}

exports.start = function(prompt, source, eval_, useGlobal, ignoreUndefined) {
  var repl = new InodeREPLServer(prompt, source, eval_, useGlobal, ignoreUndefined);
  if (!exports.repl) exports.repl = repl;
  return repl;
};
