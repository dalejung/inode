var repl = require('./inode_repl.js')
var net = require('net')
var fs = require('fs')
var path = require('path')

var repr = require('./repr.js').repr
var run_magic = require('./magic/run_magic.js');
var ipy_magic = require('./ipy_node/ipy_magic.js');

// Keep track of repl kernels
repl_kernels = {}

net.createServer(function (socket) {
  var r = repl.start({
    prompt: ">>> ",
    input: socket,
    output: socket, 
    useGlobal: false,
    terminal: true, 
    writer : repr
  });

  r.install_magic(run_magic);
  r.install_magic(ipy_magic);

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

/*
 * Start up an httpserver to get access to internal dom vars
 */
var port = 8889;
var url = require("url");
http.createServer(function(request, response) {
  var uri = url.parse(request.url).pathname
    , filename = path.join(process.cwd(), uri);

  // Grab the internal dom for '/'
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
