#!/usr/bin/env node

////////
//Dependencies
////////
var program = require("commander");
var path = require("path");
var optcliPackage = require(path.join(__dirname, "../", "package.json"));

////////
//Configuration
////////

////////
//Methods
////////

var loadCommand = function(cmd) {
  var self = this;
  return function() {
    require("../lib/commands/" + cmd)
      .apply(self, arguments);
  }
}

////////
//Application
////////
program
  .version(optcliPackage.version)
  .usage(" - " + optcliPackage.description)
  .description(optcliPackage.description)

//Host Command
program
  .command("host [style] [scripts...]")
  .option("-s, --https", "HTTPS")
  .option("-p, --port [port]", "Port")
  .option("-l, --live", "Live")
  .option("-i, --install", "Install")
  .description("Host files locally")
  .action(loadCommand("host"));

//Host Command
program
  .command("script")
  .option("-p, --port <port>", "Port")
  .option("-j, --jQuery [jQuery]", "Use jQuery")
  .option("-i, --include <include>", "Include Pattern")
  .description("Host variation locally")
  .action(loadCommand("script"));


//Show help if no arguments are passed
if (!process.argv.slice(2).length) {
  program._name = process.argv[1];
  program._name = program._name.substr(program._name.lastIndexOf("/") + 1);
  program.outputHelp();
}

program.parse(process.argv);
