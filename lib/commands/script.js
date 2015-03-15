var fs = require('fs');
var path = require('path');
var ejs = require('ejs');
module.exports = function(program){
  var script = path.resolve(__dirname, '../../templates/install.user.js.ejs');
  var options = {
    inc : program.include || '',
    jquery : program.jquery || false,
    port : program.port || 8080
  };
  var output = ejs.render(fs.readFileSync(script, 'utf8'), options);
  if(!program._no_out) console.log(output);
  return output;
}
