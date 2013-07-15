var IPython = require('./ipython').IPython

module.exports.ipy_kernel = function (base_url, notebook_id) {
  return new IPythonBridge(base_url, notebook_id);
}

handle_stuff = function(tag) {
  return function(content) {
    console.log(tag, content);
  }
}

handle_output = function (msg_type, content) {
  global.content = content
  console.log(msg_type)
}

var callbacks = {
    'execute_reply': handle_stuff('exec'),
    'output': handle_output,
    'clear_output': handle_stuff('clear'),
    'set_next_input': handle_stuff('setnext')
};

var IPythonBridge = function(base_url, notebook_id) {
  var self = this;

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

IPythonBridge.prototype.execute = function(code) {
  if (this.kernel_ready) {
    return this.kernel.execute(code, callbacks, {'silent':false});
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
