module.exports.code_match = function(code) {
  // helper func to grab %run arg1 arg2 ....
  if (code.search('%') == 0) {
    var bits = code.split(' ');
    // %run magic
    return [bits[0], bits.slice(1)]
  }
}
