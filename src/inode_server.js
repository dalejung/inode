var repl = require('repl')
var net = require('net')
var fs = require('fs')
var path = require('path')
var vm = require('vm')

var repr = require('./repr.js').repr
var run_magic = require('./run_magic.js');

function inner_eval(code, context, file) {
  // search for magic functions
  if (code.search('%') == 1) {
    // remove parens and newline
    var bare_code = code.substr(1, code.length-3)
    var bits = bare_code.split(' ');
    // %run magic
    if (bits[0] == '%run') {
      result = run_magic.run(bits[1], context)
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
    terminal: true, 
    writer : repr
  });

  r.on('exit', function () {
    delete repl_kernels[r.name]
    socket.end()
  })
  var name = socket.remoteAddress+':'+socket.remotePort
  
  r.context.socket = socket;
  r.context.r = r;
  r.context.run = function(file) { return run_magic.run(file, r.context) }
  // Allow a inode pre hook. This allows us to do things
  // like modify d3.csv to import locally and setup
  // global vars expected to exist in browser
  try {
    run_magic.run('./inode_premod.js', r.context)
  } 
  catch (err) {
    console.log(err);
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

var port = 8889;
var url = require("url");

http.createServer(function(request, response) {

  var uri = url.parse(request.url).pathname
    , filename = path.join(process.cwd(), uri);

  if (uri == '/') {
    return inode_base_handler(request, response)
  }

  fs.exists(filename, function(exists) {
    if(!exists) {
      response.writeHead(404, {"Content-Type": "text/plain"});
      response.write("404 Not Found\n");
      response.end();
      return;
    }

    if (fs.statSync(filename).isDirectory()) filename += '/index.html';

    fs.readFile(filename, "binary", function(err, file) {
      if(err) {        
        response.writeHead(500, {"Content-Type": "text/plain"});
        response.write(err + "\n");
        response.end();
        return;
      }

      response.writeHead(200);
      response.write(file, "binary");
      response.end();
    });
  });
}).listen(parseInt(port, 10));

function inode_base_handler(req, res) {
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
}
