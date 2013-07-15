var Contextify = require('contextify');
var fs = require('fs');

function combine_scripts(base_dir, scripts) {
  var contents = []
  for (var i = 0; i < scripts.length; i++) {
    var script = base_dir + '/' +scripts[i];
    var filename = require.resolve(script);
    var content = fs.readFileSync(filename, 'utf8');
    contents.push(content);
  }
  var combined = contents.join('\n');
  return combined;
}

function ipython_js(ipython_dir) {
 
  ipython_dir = ipython_dir ? ipython_dir : process.env.IPYTHON_DIR
  ipython_dir = ipython_dir ? ipython_dir : '.'

  ipython_scripts = ['namespace.js', 'utils.js', 'kernel.js'];
  combined = combine_scripts(ipython_dir, ipython_scripts);
  return combined
}

var $ = require('jquery').create();
// kernel needs document var for document.cookies
window = $('html').parent().get(0).parentWindow
document = window.document
var WebSocket = require('ws');
var sandbox = { 
  console : console, 
  $ : $, 
  WebSocket : WebSocket, 
  setTimeout : setTimeout,
  document : document,
};

Contextify(sandbox);
// run the minimal ipython
combined = ipython_js();
sandbox.run(combined);

IPython = sandbox.IPython;

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

module.exports.ipy_kernel = function (base_url, notebook_id) {
  return new IPythonBridge(base_url, notebook_id);
}
