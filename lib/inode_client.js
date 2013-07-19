var net = require('net')
 

module.exports = function(port) {
  var sock = net.connect(port)
   
  process.stdin.pipe(sock)
  sock.pipe(process.stdout)
   
  sock.on('connect', function () {
    process.stdin.setRawMode(true)
  })
   
  sock.on('close', function done () {
    process.stdin.setRawMode(false)
    process.stdin.pause()
    sock.removeListener('close', done)
  })
   
  process.stdin.on('end', function () {
    sock.destroy()
  })
   
  process.stdin.on('data', function (b) {
    if (b.length === 1 && b[0] === 4) {
      //process.stdin.emit('end')
    }
  })
}
