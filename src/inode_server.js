var repl = require('repl')
var net = require('net')
var fs = require('fs')
var path = require('path')
var vm = require('vm')

var Script = process.binding('evals').NodeScript;
var runInNewContext = Script.runInNewContext;

// need this for our relative import to work
module.filename = path.resolve('inode');
console.log(module.filename);

var run = function(file, global_ns) {
  /*
   * Runs a file and then add variables to global scope. 
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

  sandbox.__filename = filename;
  sandbox.__dirname = dirname;
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
  if (context === global) {
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

// Keep track of repl kernels
repl_kernels = {}

net.createServer(function (socket) {
  var r = repl.start({
    prompt: ">>> ",
    eval: inode_eval, 
    input: socket,
    output: socket, 
    useGlobal: false,
    terminal: true
  });

  r.on('exit', function () {
    delete repl_kernels[r.name]
    socket.end()
  })
  var name = socket.remoteAddress+':'+socket.remotePort
  
  r.context.socket = socket
  r.context.run = run
  // Allow a inode pre hook. This allows us to do things
  // like modify d3.csv to import locally and setup
  // global vars expected to exist in browser
  try {
    premod = require('./inode_premod.js')
    for (var name in premod) {
      r.context[name] = premod[name];
    }
  } 
  catch (err) {
  }
  r.name = name
  repl_kernels[r.name] = r

}).listen(1337)

var http = require('http');
var default_callback = function() {
  if (typeof(d3) != 'undefined') {
    return d3.select('html')[0][0].innerHTML;
  }
  return 'no handler set';
};

http.createServer(function (req, res) {
  // for now default to first one
  // eventually have the ability for target /kernel_name
  var r = repl_kernels[Object.keys(repl_kernels)[0]]

  res.writeHead(200, {'Content-Type': 'text/html'});
  if (r.context._http_callback) {
    html = r.context._http_callback();
  } else {
    html = default_callback();
  }
  res.write(html);
  res.end();
}).listen(8889);
