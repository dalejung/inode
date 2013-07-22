var fs = require('fs')
var url = require("url");
var path = require('path')
var http = require('http')

var Q = require('q');
var querystring = require('querystring');
var browserResolve = require('browser-resolve');
var browserify_od = require('./browserjs.js').browserify_od;

var is_common_js = require('./util.js').is_common_js

var default_callback = function() {
  if (typeof(d3) != 'undefined') {
    return d3.select('html')[0][0].innerHTML;
  }
  return 'no handler set';
};

/*
 * Start up an httpserver to get access to internal dom vars
 */
var HTTP_OPTS = {
  'Access-Control-Allow-Origin': '*',
  "Access-Control-Allow-Headers": "Cache-Control, Pragma, Origin, Authorization, Content-Type, X-Requested-With", 
  "Access-Control-Allow-Methods": "GET, PUT, POST"
};

var http_handler = function(request, res) {
  var parsed = url.parse(request.url);
  var uri = parsed.pathname
    , filename = path.join(process.cwd(), uri);
  var qs = querystring.parse(parsed.query);

  var repl_kernels = this.repl_kernels;
  // Grab the internal dom for '/'
  if (uri == '/') {
    return inode_base_handler(request, res, repl_kernels)
  }

  if (uri == '/proxy') {
    var proxy_url = qs['url'];
    return proxy_request(proxy_url, res);
  }

  // either grab a browser path or try to grab the file locally
  var opts = {filename: __filename};
  browserResolve(uri.slice(1), opts, function(err, path, info) {
    if (path) { // found browser path
      filename = path;
      name = info['name'];
      return browserify_od(filename, res, name);
    }
    return static_file(filename, res);
  });
};

function proxy_request(proxy_url, res) {
  var req = url.parse(proxy_url);
  var options = {
    host: req.hostname,
    port: req.port, 
    path: req.path
  };
  var resp = res;
  var callback = function(proxy_res) {
    proxy_res.on('data', function (chunk) {
      resp.write(chunk);
    });
    proxy_res.on('end', function () {
      resp.end()
    });
  };
  http.request(options, callback).end();
}

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
        res.writeHead(500, HTTP_OPTS);
        res.write(err + "\n");
        res.end();
        return;
      }

      var ext = path.extname(filename);
      if (ext == '.js') {
        return static_js_handler(filename, file, res);
      }
      res.writeHead(200, HTTP_OPTS);
      res.write(file, "binary");
      res.end();
    });
  });
};


function static_js_handler(filename, file, res) {
  if (is_common_js(file)) {
    return browserify_od(filename, res);
  }

  res.writeHead(200, HTTP_OPTS);
  res.write(file, "binary");
  res.end();
}

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

