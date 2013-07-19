var magic_tools = require('./magic_tools.js');
var Q = require('q');
var fs = require('fs');
var colorize = require('../util.js').colorize;

var exec = require('child_process').exec;

function exec_promise(cmd) { 
  var deferred = Q.defer()
  exec(cmd, function(error, stdout, stderr){ console.log(colorize(stdout, 'cyan')); deferred.resolve()});
  deferred.promise.pause_repl = true;
  return deferred.promise;
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
