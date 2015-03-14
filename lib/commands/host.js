/**
 * Module dependencies
 */
var express = require('express');
var path = require('path');
var fs = require('fs');
var ejs = require('ejs');
var ws = require('ws');
var unescape2 = require('../unescape2');

var getSSLCredentials = function(options, callback) {
  if(typeof callback !== 'function') return;
  var certPath = path.resolve(process.cwd(),'server.cert');
  var keyPath = path.resolve(process.cwd(),'server.key');
  var cert;
  var key;
  if(fs.existsSync(certPath)){
    cert = fs.readFileSync(certPath, 'utf8');
  }
  if(fs.existsSync(keyPath)){
    key = fs.readFileSync(keyPath, 'utf8');
  }
  if(cert && key){
    console.log('local certificate and private key found');
    return callback(null,{
      key: key,
      cert: cert
    })
  }
  console.log('missing local certificate or private key');
  var pem = require('pem');
  pem.createCertificate(options, function(err, keys){
    console.log('creating local certificate');
    fs.writeFileSync(certPath, keys.certificate);
    console.log('creating local private key');
    fs.writeFileSync(keyPath, keys.serviceKey);
    callback(null,{
      key: keys.serviceKey,
      cert:  keys.certificate
    })
  });
}

var styleTemplate =  fs.readFileSync(path.resolve(__dirname,
  '../../templates/style.css'),'utf8');
var scriptTemplate = fs.readFileSync(path.resolve(__dirname,
  '../../templates/script.js'),'utf8');

module.exports = function(style, scripts, program) {
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
  style = path.resolve(process.cwd(), style);
  scripts = scripts.map(function(scrpit) {
    return path.resolve(process.cwd(), scrpit);
  });

  //Start Server
  var app = express();
  //set the routes

  if (program.install) {
    app.get('/', function(req, ress) {
      req.end('not implemented');
    })
  }

  app.get('/script.js', function(req, res) {
    res.set({
      'Content-Type': 'text/javascript'
    });
    var code = [];
    if (program.live) code.push(reloadScript)
    for (var i = 0; i < scripts.length; i++)
      if (fs.existsSync(scripts[i])) code.push(fs.readFileSync(scripts[i], 'utf8'));
    code = code.join('\n');
    res.end(unescape2(ejs.render(
      scriptTemplate, {
        code: code
      }
    )));
  });
  app.get('/style.css', function(req, res) {
    res.set({
      'Content-Type': 'text/css'
    });
    var code = '';
    if (fs.existsSync(style)) code = fs.readFileSync(style, 'utf8');
    res.end(unescape2(ejs.render(
      styleTemplate, {
        code: code
      }
    )));
  });
  //start the server
  var server;
  var serverConnected = function() {
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
        })
      });
      var watch = require('watch');
      var watcher = function() {
        connectedSockets.forEach(function(socket) {
          socket.send('reload');
        });
      }
      watch.createMonitor(process.cwd(), function(monitor) {
        //var files = [style].concat(scripts);
        monitor.on('created', function(f, stat) {
          watcher();
        })
        monitor.on('changed', function(f, curr, prev) {
          watcher();
        })
        monitor.on('removed', function(f, stat) {
          watcher();
        })
      })
      console.log('Live reload enabled for %s', path.resolve('..', process.cwd()));
    }
    console.log('point your browser to http' + (program.https ? 's' : '') + '://localhost:' + program.port);
    console.log('Ctrl-c to quit');
  };
  if (program.https) {
    getSSLCredentials({days:1, selfSigned:true},function(error, credentials){
      if(error) throw(error);
      var httpsServer = require('https').createServer(credentials, app);
      server = httpsServer.listen(program.port, serverConnected);
    });
  } else {
    server = app.listen(program.port, serverConnected)
  };
}
