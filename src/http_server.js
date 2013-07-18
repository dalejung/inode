var fs = require('fs')
var url = require("url");
var path = require('path')
var http = require('http')

var default_callback = function() {
  if (typeof(d3) != 'undefined') {
    return d3.select('html')[0][0].innerHTML;
  }
  return 'no handler set';
};

/*
 * Start up an httpserver to get access to internal dom vars
 */
var opts = {
  'Access-Control-Allow-Origin': '*',
  "Access-Control-Allow-Headers": "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With", 
  "Access-Control-Allow-Methods": "GET, PUT, POST"
};
var http_handler = function(request, res) {
  var uri = url.parse(request.url).pathname
    , filename = path.join(process.cwd(), uri);

  var repl_kernels = this.repl_kernels;
  // Grab the internal dom for '/'
  if (uri == '/') {
    return inode_base_handler(request, res, repl_kernels)
  }

  return static_file(filename, res);
};

function static_file(filename, res) {
  fs.exists(filename, function(exists) {
    if(!exists) {
      res.writeHead(404, {"Content-Type": "text/plain"});
      res.write("404 Not Found\n");
      res.end();
      return;
    }

    if (fs.statSync(filename).isDirectory()) filename += '/index.html';

    fs.readFile(filename, "binary", function(err, file) {
      if(err) {        
        res.writeHead(500, opts);
        res.write(err + "\n");
        res.end();
        return;
      }

      var ext = path.extname(filename);
      res.writeHead(200, opts);
      res.write(file, "binary");
      res.end();
    });
  });
};

function inode_base_handler(req, res, repl_kernels) {
  // for now default to first one
  // eventually have the ability for target /kernel_name
  var r = repl_kernels[Object.keys(repl_kernels)[0]]

  res.writeHead(200, {
                      'Content-Type': 'text/html', 
                      'Access-Control-Allow-Origin' : '*'});
  if (r.context._http_callback) {
    html = r.context._http_callback();
  } else {
    html = default_callback();
  }
  res.write(html);
  res.end();
}

module.exports = function(repl_kernels) {
  if ('undefined' === typeof(repl_kernels)) {
    repl_kernels = {}
  }
  var server = http.createServer(http_handler);
  server.repl_kernels = repl_kernels;
  return server;
};
