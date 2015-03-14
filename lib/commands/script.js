var fs = require('fs');
var path = require('path');
var ejs = require('ejs');
module.exports = function(port, program){
  var script = path.resolve(__dirname, '../../templates/install.user.js.ejs');

  var options = {
    inc : program.pattern || false,
    jQuery : program.jQuery || false,
    port : port || 8080
  }
  var output = ejs.render(fs.readFileSync(script, 'utf8'), options);
  if(!program.noout) console.log(output);
  return output;
}
