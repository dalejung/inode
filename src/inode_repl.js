var repl = require('repl');
var vm = require('vm')
var inherits = require('util').inherits;

function InodeREPLServer(prompt, source, eval_, useGlobal, ignoreUndefined) {
  repl.REPLServer.call(this, prompt, source, eval_, useGlobal, ignoreUndefined);

  this.magics = [];
  this.eval = inode_eval;
}

inherits(InodeREPLServer, repl.REPLServer);
exports.InodeREPLServer = InodeREPLServer;

InodeREPLServer.prototype.install_magic = function(magic) {
  this.magics.push(magic);
}

function inner_eval(code, context, file) {
  // remove parens and newline
  var bare_code = code.substr(1, code.length-3);
  // attempt to get a result from each magic
  for (var i = 0; i < this.magics.length; i++) {
    var magic = this.magics[i];
    var result = magic.eval(bare_code, context);
    if (typeof(result) !== 'undefined') {
      return result;
    }
  }

  // normal eval
  if (context === global) {
    result = vm.runInThisContext(code, file);
  } else {
    result = vm.runInContext(code, context, file);
  }
  return result;
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
    cb(err, result);
  }
}

exports.start = function(prompt, source, eval_, useGlobal, ignoreUndefined) {
  var repl = new InodeREPLServer(prompt, source, eval_, useGlobal, ignoreUndefined);
  if (!exports.repl) exports.repl = repl;
  return repl;
};
