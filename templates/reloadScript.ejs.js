(function(){
  var reconnectInterval = 1000;
  var ws;
  var connect = function(){
      if(ws) return;
      console.log("socket connecting...");

      ws = new WebSocket('<%= _protocol %>://localhost:<%= _port %>/');
      ws.onopen = function() {
        console.log("socket connected.");
        //window.location.reload();
      };
      ws.onerror = function() {
        ws = null;
        console.log('socket error. reconnecting...');
        setTimeout(connect, reconnectInterval);
      };
      ws.onclose = function() {
        ws = null;
        console.log('socket close. reconnecting...');
        setTimeout(connect, reconnectInterval);
      };
      ws.onmessage =function(message){
        switch(message.data){
          case 'reload': window.location.reload(); break;
        }
      };
  };
  connect();
})();
