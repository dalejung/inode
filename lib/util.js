var inspect = require('util').inspect;

function colorize(str, color) {
  if (color) {
    return '\u001b[' + inspect.colors[color][0] + 'm' + str +
           '\u001b[' + inspect.colors[color][1] + 'm';
  } else {
    return str;
  }
}

module.exports.colorize = colorize;

function is_common_js(content) {
  /*
   * kind of a silly util func to see if a file is in CommonJS format...
   */
  var lines = content.split('\n');
  var has_require = false;
  var has_export = false;
  for (var i=0; i < lines.length; i++) {
    var line = lines[i];
    if (!has_require) {
      var start_req = line.indexOf("require(");
      var comment = line.indexOf("//"); // guard against commented code
      if ((start_req != -1) && (comment == -1 || (comment > start_req))) {
        has_require = true;
      }
    }
    if (!has_export) {
      var exported = line.indexOf('exports');
      var assign = line.indexOf('=');
      if (exported != -1 && assign > exported) {
        has_export = true;
      }
    }
    if (has_export && has_require) {
      return true;
    }
  }
  return false;
}

module.exports.is_common_js = is_common_js;
