var IPython = require('./ipython.js')
var fs = require('fs');
var Q = require('q');

var startup_python = fs.readFileSync(__dirname+'/../startup.py', 'utf8');
var deferred_callback_router = require('./callbacks.js').deferred_callback_router;

var Kernel = function(base_url, notebook_id, config) {
  if (config) {
    var context = config.context;
  }

  if (!context) {
    context = "undefined" != typeof window ? window : global;
  }
  this.context = context;

  this.base_url = base_url;
  this.notebook_id = notebook_id;
  this.kernel = null;
  this.kernel_ready = false;
  this.command_buffer = [];
}

Kernel.prototype.start = function() {
  var deferred = Q.defer();
  var self = this;
  this.kernel = new IPython.Kernel(this.base_url, 'kernels');
  this.kernel.start(this.notebook_id);
  this.check_kernel(function() {
    deferred.resolve(self);
  });

  if (typeof(startup_python) !== 'undefined') {
    this.execute(startup_python);
  }
  return deferred.promise;
};

Kernel.prototype.check_kernel = function(callback) {
  var self = this;
  if (!self.kernel.shell_channel) {
    setTimeout(function() { self.check_kernel(callback); }, 100);
  } 
  else {
    if (callback) {
      callback();
    }
    self.kernel_ready = true;
  }
}

Kernel.prototype._execute = function(code, deferred) {
  var self = this;
  return this.kernel.execute(code, deferred_callback_router(self, deferred), {'silent':false});
}

Kernel.prototype.execute = function(code, callbacks) {
  // always push to buffer and htne try to execute. 
  // took out immediate execution so everything goes through the same path
  var deferred = Q.defer(); 
  this.command_buffer.push([code, deferred]);      
  this.execute_buffer();
  return deferred.promise;
}

Kernel.prototype.execute_buffer = function() {
  var self = this;
  if (!(self.kernel_ready)) {
    setTimeout(function() { self.execute_buffer(); }, 300);
    return;
  }
  if (self.command_buffer.length > 0) {
    var command = self.command_buffer.pop();
    var code = command[0];
    var deferred = command[1];
    self._execute(code, deferred);
  }
}

Kernel.prototype.pull = function(name) {
  var code = "to_json("+name+")";
  var pull_deferred = Q.defer();
  var deferred = this.execute(code);
  deferred.then(function(data) {
    var content = data.content;
    var context = data.context;
    var json = content['data']['application/json'];
    if (json) {
        var jsobj = JSON.parse(json);
        context[name] = jsobj;
        pull_deferred.resolve(jsobj);
    }
    pull_deferred.reject(new Error('did not get json back'));
  });
  pull_deferred.promise.pause_repl = true;
  return pull_deferred.promise;
}

Kernel.prototype.__repr__ = function() {
  return ' Bridge \nbase_url='+this.base_url+"\nnotebook_id="+this.notebook_id;
}

module.exports = Kernel;
