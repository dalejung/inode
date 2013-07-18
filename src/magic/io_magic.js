var magic_tools = require('./magic_tools.js');
var Q = require('q');
var fs = require('fs');
var inspect = require('util').inspect;

var exec = require('child_process').exec;

function exec_promise(cmd) { 
  var deferred = Q.defer()
  exec(cmd, function(error, stdout, stderr){ console.log(stylizeWithColor(stdout, 'cyan')); deferred.resolve()});
  deferred.promise.pause_repl = true;
  return deferred.promise;
}

function stylizeWithColor(str, style) {
  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}

module.exports.eval = function(code, context) {
  var bits = code.split(' ');
  var cmd = bits[0];
  if (cmd == 'pwd') {
    return process.cwd();
  }
  if (cmd == 'ls') {
    return exec_promise(code);
  }
  if (cmd == 'cd') {
    return process.chdir(bits[1]);
  }
}
