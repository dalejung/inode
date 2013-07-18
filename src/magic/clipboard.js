var magic_tools = require('./magic_tools.js');
var Q = require('q');

module.exports.eval = function(code, context) {
  // %run magic
  var res = magic_tools.code_match(code); 
  if (!res) {
    return;
  }
  var magic_cmd = res[0];
  var args = res[1];
  if (magic_cmd == '%paste') {
    var deferred = Q.defer();
    require('child_process').exec(
        'pbpaste',
        function(err, stdout, stderr) {
          if(err) {
            deferred.reject(err);
            return;
          }
          if(stderr) {
            deferred.reject(stderr);
            return;
          }
          if(stdout) {
            deferred.resolve(stdout);
          }
        }
    );
    deferred.promise.pause_repl = true;
    return deferred.promise;
  }
}
