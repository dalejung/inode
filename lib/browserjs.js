var Q = require('q');
var fs = require('fs');
var path = require('path')
var browserify = require('browserify');

var EXTERNALS = ['d3', 'jquery-browserify', 'q', 'events'];

var BROWSERIFY_CACHE = {
  caches : {}, 
  get : function(filepath) {
    var cache = this.caches[filepath];
    // check stale
    if (typeof(cache) == 'undefined') {
      cache = new BrowserifyCache(filepath);
      this.caches[filepath] = cache;
    }
    return cache;
  }, 
  on_file : function(file, cache) {
    cache.add_file(file);
  }
};

function BrowserifyCache(filepath) {
  this.filepath = filepath;
  this.name = null;
  this.src = null;
  this.files = {};
}

BrowserifyCache.prototype.add_file = function(file) {
  var self = this;
  var stat = fs.stat(file, function(err, stats) {
    self.files[file] = stats['mtime'];
  })
}

BrowserifyCache.prototype.up_to_date = function() {
  var deferred = Q.defer();
  // short circuit, we have source but no files
  if (this.src && Object.keys(this.files).length == 0) {
    deferred.resolve(true);
  }
  if (!(this.src)) {
    deferred.resolve(false);
  }
  // check files
  var promises = [];
  for (var fn in this.files) {
    var old_time = this.files[fn];
    var filename = fn;
    var promise = is_current(filename, old_time);
    promises.push(promise);
  }

  Q.all(promises).then(function(res) { 
    if (res.length == 0) {
      return deferred.resolve(false);
    }
    // if any file not up current, fail
    for (var i=0; i < res.length; i++) {
      if (!res[i]) {
        return deferred.resolve(false);
      }
    }
    return deferred.resolve(true);
  });
  // need to check actual mtimes
  return deferred.promise;
}

module.exports.browserify_od = function browserify_od(filepath, res, name) {
  // on demand
  var cache = BROWSERIFY_CACHE.get(filepath);
  cache.name = name;

  cache.up_to_date().then(function(current) {
    if (current) {
      res.write(cache.src);
      res.end();
    } else {
      build_js(filepath, cache, res, name);
    }
  })
}

function build_js(filepath, cache, res, name) {
  var b = setup(filepath, name);
  var promise = bundle(b, b.opts, cache);

  var next = promise.then(function(src) {
    res.write(cache.src);
    res.end();
  }, function(err) {
    res.write("// Browserify error\n" + err.toString());
    res.end();
  });
  return next;
}

function setup(filepath, name) {
  var b = browserify();
  // register file handlers
  b.add(filepath);

  var filename = path.basename(filepath);
  if (!name) {
    // bob.js -> bob
    name = filename.split('.')[0];
  }

  for (var i=0; i < EXTERNALS.length; i++) {
    b.external(EXTERNALS[i]);
  }

  var opts = {}
  opts.standalone = name;
  b.transform('brfs');
  b.opts = opts;
  return b
}

function bundle(b, opts, cache) {
  var deferred = Q.defer();

  b.on('file', function(file, id, parent) {
    cache.add_file(file);
  });

  b.bundle(opts, function(err, src) {
    if (src) {
      cache.src = src;
      deferred.resolve(src);
    } else {
      deferred.reject(err);
    }
  });

  return deferred.promise;
}

function is_current(file, old_time) {
  var deferred = Q.defer();
  var stat = fs.stat(file, function(err, stats) {
    if (stats['mtime'] > old_time) {
      deferred.resolve(false);
    } else {
      deferred.resolve(true);
    }
  })
  return deferred.promise;
}

module.exports.commonjs = function(res) {
  var cache = BROWSERIFY_CACHE.get('commonjs');
  var b = browserify();

  if (cache.src) {
    res.write(cache.src);
    res.end()
  }

  for (var i=0; i < EXTERNALS.length; i++) {
    b.require(EXTERNALS[i]);
  }

  bundle(b, {}, cache).then(function(src) {
    res.write(src);
    res.end()
  });
}
