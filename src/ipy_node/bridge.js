var IPython = require('./ipython').IPython
var default_callbacks = require('./callbacks.js').default_callbacks
var callback_router = require('./callbacks.js').callback_router

module.exports.ipy_kernel = function (base_url, notebook_id, config) {
  return new IPythonBridge(base_url, notebook_id, config);
}

var IPythonBridge = function(base_url, notebook_id, config) {
  var self = this;
  if (config) {
    var callbacks = config.callbacks
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

  callbacks = callbacks ? callbacks : default_callbacks(self)
  self.callbacks = callbacks
  self.callback_router = callback_router(self);
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

IPythonBridge.prototype._execute = function(code, callbacks) {
  var self = this;
  return this.kernel.execute(code, self.callback_router, {'silent':false});
}

IPythonBridge.prototype.execute = function(code, callbacks) {
  if (this.kernel_ready) {
    return this._execute(code, callbacks);
  }
  else {
    this.command_buffer.push(code);      
    this.execute_buffer();
  }
}

IPythonBridge.prototype.execute_buffer = function() {
  var self = this;
  if (!(self.kernel_ready)) {
    setTimeout(function() { self.execute_buffer(); }, 300);
    return;
  }
  if (self.command_buffer.length > 0) {
    var code = self.command_buffer.pop();
    self.execute(code);
  }
}

IPythonBridge.prototype.__repr__ = function() {
  return 'IPython Bridge \nbase_url='+this.base_url+"\nnotebook_id="+this.notebook_id;
}
