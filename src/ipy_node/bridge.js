var Q = require('q');

var IPython = require('./ipython').IPython
var default_callbacks = require('./callbacks.js').default_callbacks
var callback_router = require('./callbacks.js').callback_router
var deferred_callback_router = require('./callbacks.js').deferred_callback_router

module.exports.ipy_kernel = function (base_url, notebook_id, config) {
  return new IPythonBridge(base_url, notebook_id, config);
}

var IPythonBridge = function(base_url, notebook_id, config) {
  var self = this;
  if (config) {
    var context = config.context
  }

  self.context = context;

  self.base_url = base_url;
  self.notebook_id = notebook_id;
  self.kernel = new IPython.Kernel(base_url, 'kernels');
  self.kernel.start(notebook_id);
  self.kernel_ready = false;
  self.check_kernel();
  self.command_buffer = [];
  self.window = window;
  self.document = document;
}

IPythonBridge.prototype.check_kernel = function() {
  var self = this;
  if (!self.kernel.shell_channel) {
    setTimeout(function() { self.check_kernel(); }, 100);
  } 
  else {
    self.kernel_ready = true;
  }
}

IPythonBridge.prototype._execute = function(code, deferred) {
  var self = this;
  return this.kernel.execute(code, deferred_callback_router(self, deferred), {'silent':false});
}

IPythonBridge.prototype.execute = function(code, callbacks) {
  // always push to buffer and htne try to execute. 
  // took out immediate execution so everything goes through the same path
  var deferred = Q.defer(); 
  this.command_buffer.push([code, deferred]);      
  this.execute_buffer();
  return deferred.promise;
}

IPythonBridge.prototype.execute_buffer = function() {
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

IPythonBridge.prototype.__repr__ = function() {
  return 'IPython Bridge \nbase_url='+this.base_url+"\nnotebook_id="+this.notebook_id;
}
