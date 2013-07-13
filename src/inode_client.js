var net = require('net')
 
var sock = net.connect(1337)
 
process.stdin.pipe(sock)
sock.pipe(process.stdout)
 
sock.on('connect', function () {
  process.stdin.setRawMode(true)
})
 
sock.on('close', function done () {
  sock.removeListener('close', done)
  process.stdin.pause()
})
 
process.stdin.on('end', function () {
  process.stdin.setRawMode(false)
  sock.destroy()
})
 
process.stdin.on('data', function (b) {
  if (b.length === 1 && b[0] === 4) {
    process.stdin.emit('end')
  }
})

