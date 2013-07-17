var fs = require('fs');

var filename = require.resolve('./startup.py');
var content = fs.readFileSync(filename, 'utf8');
content = JSON.stringify(content)
content = "var startup_python = "+content;
process.stdout.write(content)
