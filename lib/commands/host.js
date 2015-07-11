////////
// Dependencies
////////
var express = require('express');
var path = require('path');
var fs = require('fs');
var ejs = require('ejs');
var ws = require('ws');
var unescape2 = require('../unescape2');
var defaultCertPath = path.resolve(__dirname + '../../../ssl/server.cert');
var defaultKeyPath = path.resolve(__dirname + '../../../ssl/server.key');
////////
// Methods
////////
console.log();
var getSSLCredentials = function(options, callback) {
  if(typeof callback !== 'function') return;
  var cert;
  var key;
  //Use included credentials
  if(options.__useincluded) {
      cert = fs.readFileSync(defaultCertPath);
      key = fs.readFileSync(defaultKeyPath);
      console.log('Using included credentials.\nCertificate:');;
      console.log(cert);
      return callback(null,{
        cert : cert,
        key : key
      });
  }
  //Use local credentials
  var certPath = path.resolve(process.cwd(), 'server.cert');
  var keyPath = path.resolve(process.cwd(), 'server.key');

  if(fs.existsSync(certPath)){
    cert = fs.readFileSync(certPath, 'utf8');
    if(fs.existsSync(keyPath)){
      key = fs.readFileSync(keyPath, 'utf8');
    };
  };
  if(cert && key){
    console.log('Local certificate found: %s ...', certPath);
    console.log(cert);
    console.log('Local key found: %s ...', keyPath);
    console.log('Using local credentials.');
    return callback(null,{
      key: key,
      cert: cert
    })
  };
  //Create Credentials
  require('pem').createCertificate(options, function(error, keys){
    if(error) return console.log(error);
    cert = keys.certificate;
    key = keys.serviceKey;
    if(options.__savehttps){
      console.log('Creating local credentials...');
      fs.writeFileSync(certPath, cert);
      console.log('Local certificate created: %s ...', certPath);
      console.log(cert);
      fs.writeFileSync(keyPath, key);
      console.log('Local key created: %s ...', keyPath);
      console.log('Using local credentials.');
    }else{
      console.log('Using temporary credentials.\nCertificate:');;
      console.log(cert);
    }
    callback(null,{
      cert : cert,
      key : key
    })
  });
}
console.log("A %s", path.resolve(__dirname,
  '../../templates/style.css'))

  console.log("A %s", path.resolve(__dirname))
var styleTemplate =  fs.readFileSync(path.resolve(__dirname,
  '../../templates/style.css'),'utf8');
var scriptTemplate = fs.readFileSync(path.resolve(__dirname,
  '../../templates/script.js'),'utf8');
var includeJqueryTemplate = fs.readFileSync(path.resolve(__dirname,
    '../../templates/includeJquery.ejs.js'),'utf8');


module.exports = function(program) {
  program.port = program.port || 8080
  if (program.live) {
    var reloadScript = unescape2(ejs.render(
      fs.readFileSync(path.resolve(__dirname,
        '../../templates/reloadScript.ejs.js'), 'utf8'), {
        _port: program.port,
        _protocol: program.https ? 'wss' : 'ws'
      }
    ))
  };
  if (program.jquery) {
    console.log("Including jQuery")
    var nonDefaultJQ = path.resolve(__dirname,
      '../../includes/jquery/' + program.jquery + '/jquery.min.js')
    nonDefaultJQ = fs.existsSync(nonDefaultJQ) ?
      nonDefaultJQ :
      path.resolve(__dirname, '../../includes/jquery/1.6.4/jquery.min.js');
    var jQueryScript = fs.readFileSync(nonDefaultJQ, 'utf8');
  };
  var styles = (program.css || []).map(function(style) {
    return path.resolve(process.cwd(), style);
  });

  var scripts = (program.js || []).map(function(scrpit) {
    return path.resolve(process.cwd(), scrpit);
  });

  //Start Server
  var app = express();
  //set the routes

  if (program.userscript || program.testpage) {
    var homeTemplate = program.testpage ?
      fs.readFileSync(path.resolve(process.cwd(), program.testpage) :
      fs.readFileSync(path.resolve(__dirname, '../../templates/home.html'),'utf8');
      app.get('/', function(req, res) {
        res.set({
          'Content-Type': 'text/html'
        });
        res.end(homeTemplate);
      });
      if(program.userscript){
        var scriptOptions = {
          port : program.port,
          _no_out : true
        };
        var hostedScript = require('./script.js')
        app.get('/install.user.js', function(req, res) {
          scriptOptions.include = req.query.include;
          scriptOptions.jquery = req.query.jquery;
          res.set({
            'Content-Type': 'text/javascript'
          });
          res.end(hostedScript(scriptOptions));
        });
      }
  }
  app.get('/script.js', function(req, res) {
    res.set({
      'Content-Type': 'text/javascript'
    });
    var code = [];
    if (program.live) code.push(reloadScript);
    for (var i = 0; i < scripts.length; i++)
      if (fs.existsSync(scripts[i])) code.push(fs.readFileSync(scripts[i], 'utf8'));
    code = code.join('\n');
    if(program.jquery){
      res.end(unescape2(ejs.render(
        includeJqueryTemplate, {
          code: code,
          jquery: jQueryScript
        }
      )));
    }else{
      res.end(unescape2(ejs.render(
        scriptTemplate, {
          code: code
        }
      )));
    }
  });
  app.get('/style.css', function(req, res) {
    res.set({
      'Content-Type': 'text/css'
    });
    var code = [];
    for (var i = 0; i < styles.length; i++)
      if (fs.existsSync(styles[i])) code.push(fs.readFileSync(styles[i], 'utf8'));
    code = code.join('\n');
    res.end(unescape2(ejs.render(
      styleTemplate, {
        code: code
      }
    )));
  });
  //start the server
  var server;
  var serverConnected = function() {
    if(program.userscript)
    console.log(
      'Point your browser to http%s://localhost:%s to install userscript.', (program.https ? 's' : '') , program.port);
    if (program.live) {
      var WS = require('ws').Server;
      var wss = new WS({
        server: server
      });
      var connectedSockets = [];
      wss.on('connection', function(socket) {
        connectedSockets.push(socket);
        console.log('SOCKET OPEN');
        socket.on('close', function(reason) {
          console.log(
            'SOCKET CLOSED %s %s',
            socket._closeCode,
            socket._closeMessage);
          connectedSockets.splice(connectedSockets.indexOf(socket), 1);
        });
      });
      var watch = require('watch');
      var watcher = function() {
        connectedSockets.forEach(function(socket) {
          socket.send('reload');
        });
      };
      watch.createMonitor(process.cwd(), function(monitor) {
        //var files = styles.concat(scripts);
        monitor.on('created', function(f, stat) {
          watcher();
        });
        monitor.on('changed', function(f, curr, prev) {
          watcher();
        });
        monitor.on('removed', function(f, stat) {
          watcher();
        });
      });
      console.log('Live reload enabled for %s',
        path.resolve('..', process.cwd()));
    }
    if(styles.length){
      console.log('Serving Styles:');
      styles.forEach(function(style){
        console.log(style);
      });
    };
    if(scripts.length){
      console.log('Serving Scripts:');
      scripts.forEach(function(script){
        console.log(script);
      });
    };
    console.log('Ctrl-c to quit');
  };
  if (program.https) {
    getSSLCredentials({
      days : 365,
      selfSigned : true,
      __savehttps : program.savehttps,
      __useincluded : program.useincluded
    }, function(error, credentials){
      if(error) throw(error);
      var httpsServer = require('https').createServer(credentials, app);
      server = httpsServer.listen(program.port, serverConnected);
    });
  } else {
    server = app.listen(program.port, serverConnected);
  };
}
