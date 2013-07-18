var magic_tools = require('../magic/magic_tools.js');
var ipy = require('./index.js')

var LAST_DATA = null;
var CURRENT_KERNEL;
var CURRENT_BRIDGE;

module.exports.eval = function(code, context) {
  var res = magic_tools.code_match(code); 
  if (!res) {
    return;
  }
  var magic_cmd = res[0];
  var args = res[1];
  if (magic_cmd == '%ipy_bridge') {
    CURRENT_BRIDGE = new ipy.Bridge(args[0]);
    context.CURRENT_BRIDGE = CURRENT_BRIDGE;
    return CURRENT_BRIDGE;
  }

  if (magic_cmd == '%ipy_list') {
    var deferred = CURRENT_BRIDGE._list_kernels();
    deferred.pause_repl = true;
    return deferred;
  }

  if (magic_cmd == '%attach') {
    CURRENT_KERNEL = CURRENT_BRIDGE.attach(args[0], context);
    context.CURRENT_KERNEL = CURRENT_KERNEL;
    return CURRENT_KERNEL;
  }

  if (magic_cmd == '%ipy') {
    var code = args[0];
    return CURRENT_KERNEL.execute(code);
  }

  if (magic_cmd == '%pull') {
    var name = args[0];
    return CURRENT_KERNEL.pull(name);
  }
}
