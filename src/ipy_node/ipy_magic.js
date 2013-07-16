var http = require('http');
var Q = require('q');
var fs = require('fs');

var magic_tools = require('../magic/magic_tools.js');
var ipy = require('./ipy_node.js')

var LAST_DATA = null;
var CURRENT_KERNEL;

var host = 'idale.local';
var port = 8888;

module.exports.eval = function(code, context) {
  var res = magic_tools.code_match(code); 
  if (!res) {
    return;
  }
  var magic_cmd = res[0];
  var args = res[1];
  if (magic_cmd == '%ipy_list') {
    var deferred = active_kernels();
    deferred.then(function(data) {
      LAST_DATA = data['files'];
      var out = ["==== Active Kernels ===="];
      for (var i=0; i < data['files'].length; i++) {
        var file = data['files'][i];
        var o = '['+i+'] '+ file['name'] + ' ' + file['kernel_id'];
        out.push(o);
      }
      console.log(out.join("\n"));
    });
    return null;
  }

  if (magic_cmd == '%attach') {
    var kernel = LAST_DATA[parseInt(args[0])];
    CURRENT_KERNEL = ipy.ipy_kernel("http://"+host+":"+port, kernel['notebook_id']);
    // add startup.py to ipython environ
    var filename = require.resolve('./startup.py');
    var content = fs.readFileSync(filename, 'utf8');
    CURRENT_KERNEL.execute(content);
    return CURRENT_KERNEL;
  }

  if (magic_cmd == '%ipy') {
    var code = args[0];
    CURRENT_KERNEL.execute(code);
    return true;
  }
}

function active_kernels() {
  var deferred = Q.defer();
  var options = {
    host: host,
    port: port, 
    path: '/active_notebooks'
  };

  callback = function(response) {
    var str = '';
    //another chunk of data has been recieved, so append it to `str`
    response.on('data', function (chunk) {
      str += chunk;
    });
    //the whole response has been recieved, so we just print it out here
    response.on('end', function () {
      var data = JSON.parse(str);
      deferred.resolve(data);
    });
  }
  http.request(options, callback).end();
  return deferred.promise;
}
