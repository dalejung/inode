var repl = require('./inode_repl.js')
var net = require('net')
var http = require('http')
var fs = require('fs')
var path = require('path')

var repr = require('./repr.js').repr
var run_magic = require('./magic/run_magic.js');
var clipboard_magic = require('./magic/clipboard.js');
var ipy_magic = require('ipy_node').magic;
var io_magic = require('./magic/io_magic.js');


// Keep track of repl kernels

function socket_handler(socket) {
  var r = repl.start({
    prompt: ">>> ",
    input: socket,
    output: socket, 
    useGlobal: false,
    terminal: true, 
    writer : repr, 
    ignoreUndefined: true, 
  });

  r.install_magic(run_magic);
  r.install_magic(ipy_magic);
  r.install_magic(clipboard_magic);
  r.install_magic(io_magic);

  r.on('exit', function () {
    delete this.repl_kernels[r.name]
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

  this.repl_kernels[r.name] = r
}

var repl_server = function(http) {
  var repl_kernels = {}
  var repl_server = net.createServer(socket_handler);
  repl_server.repl_kernels = repl_kernels;

  http = 'undefined' === typeof(http) ? true : http;
  if (http) {
    var http_server = require('./http_server.js')(repl_kernels);
    repl_server.http_server = http_server;
  }
  return repl_server;
}

module.exports = function(http) {
  return repl_server(http);
}
