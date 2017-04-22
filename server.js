var express = require('express');
var app = express();
var http = require('http').Server(app);
// socket.io server must be instantiated, othervise 404 error in client side
var io = require('socket.io')(http);

var port = process.env.PORT || 8080;

var path = require('path');

// server side copy of saved paths
var saved_paths = [];

// config app
app.set('view engine', 'ejs');  // engine
app.set('views', path.join(__dirname, 'views')); // dir
app.set('json spaces', 2);

// use midleware

// define routes
app.get('/', function(req, res){
  res.render('index');
});

// simple REST api for getting saved paths
app.get('/get', function (req, res) {
  res.set("Content-type", "text/json; charset=utf-8");
  res.send( saved_paths );
});

// service client.js file for index.ejs
app.get('/client.js', function(req, res){
 res.sendFile(__dirname + '/client.js');
});

// handle socket events
io.on('connection', function(socket){
  socket.on('refresh now', function(){
    console.log('Refreshing asked... ');
    io.emit('get saved paths');
  });
  socket.on('reply from client', function(data){
    console.log('Refreshing data... ');
    // replace the whole table with new table
    saved_paths = [];
    saved_paths = data;
  });
});

// listen port
http.listen(port, function(){
 console.log('listening on ' + port);
});