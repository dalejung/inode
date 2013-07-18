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
