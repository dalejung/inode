var repl = require('repl')
var net = require('net')
var fs = require('fs')
var path = require('path')
var vm = require('vm')

var Script = process.binding('evals').NodeScript;
var runInNewContext = Script.runInNewContext;

var run = function(file, global_ns) {
  /*
   * Runs a file and then adds variables to global scope. 
   *
   * Akin to %run for ipython
   */
  var filename = require.resolve(file);
  var content = fs.readFileSync(filename, 'utf8');
  var dirname = path.dirname(filename);

  if (!global_ns) {
    global_ns = eval('global');
  }

  var sandbox = {};
  for (var k in global_ns) {
    sandbox[k] = global_ns[k];
  }
  sandbox.require = require;
  sandbox.exports = module.exports;
  sandbox.__filename = filename;
  sandbox.__dirname = dirname;
  sandbox.module = module;
  sandbox.global_ns = sandbox;

  runInNewContext(content, sandbox, filename, 0, true);
  // TODO: Should this be more restrictive?
  for (var k in sandbox) {
    global_ns[k] = sandbox[k];
  }
}

function inner_eval(code, context, file) {
  // search for magic functions
  if (code.search('%') == 1) {
    // remove parens and newline
    var bare_code = code.substr(1, code.length-3)
    var bits = bare_code.split(' ');
    // %run magic
    if (bits[0] == '%run') {
      result = run(bits[1], context)
      return result
    }
  }
  // normal eval
  if (!context) {
    result = vm.runInThisContext(code, file);
  } else {
    result = vm.runInContext(code, context, file);
  }
  return result;
}

function inode_eval(code, context, file, cb) {
  var err, result;
  try {
    result = inner_eval(code, context, file);
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

var r = repl.start({
  prompt: ">>> ",
  eval: inode_eval, 
  input: process.stdin,
  output: process.stdout, 
  useGlobal: false
});
