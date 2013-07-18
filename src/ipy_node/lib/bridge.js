var Q = require('q');
var http = require('http');
var Kernel = require('./kernel.js');
var url = require('url');

var Bridge = function(base_url) {
  var parsed = url.parse(base_url);
  this.base_url = base_url;
  this.hostname = parsed.hostname;
  this.port = parsed.port;
  this.last_kernels;
};

Bridge.prototype.start_kernel = function(notebook_id, config) {
  return new Kernel(this.base_url, notebook_id, config);
};

Bridge.prototype.active_kernels = function () {
  var deferred = Q.defer();
  var options = {
    host: this.hostname,
    port: this.port, 
    path: '/active_notebooks'
  };

  var self = this;    
  callback = function(response) {
    var str = '';
    //another chunk of data has been recieved, so append it to `str`
    response.on('data', function (chunk) {
      str += chunk;
    });
    //the whole response has been recieved, so we just print it out here
    response.on('end', function () {
      var data = JSON.parse(str);
      self.last_kernels = data['files'];
      deferred.resolve(data);
    });
  }
  http.request(options, callback).end();
  return deferred.promise;
}

Bridge.prototype._list_kernels = function() {
  var deferred = this.active_kernels();
  var list_deferred = Q.defer();
  deferred.then(function(data) {
    LAST_DATA = data['files'];
    var out = ["==== Active Kernels ===="];
    for (var i=0; i < data['files'].length; i++) {
      var file = data['files'][i];
      var o = '['+i+'] '+ file['name'] + ' ' + file['notebook_id'];
      out.push(o);
    }
    list_deferred.resolve(out.join("\n"));
  });
  return list_deferred.promise;
};

Bridge.prototype.list_kernels = function() {
  var deferred = this._list_kernels();
  var next = deferred.then(function(out) {
    console.log(out);
  });
  return next;
};

Bridge.prototype.attach = function(index, context) {
    var kernel = this.last_kernels[parseInt(index)];
    var config = {'context':context};
    return this.start_kernel(kernel['notebook_id'], config);
};


module.exports = Bridge;
