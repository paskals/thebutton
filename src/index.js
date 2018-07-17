var fs = require('fs');
var http = require('http');

var express = require('express');
var app = express();
var path = require('path');
app.use(express.static('./'));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, './index.html'));
});

var httpServer = http.createServer(app);

httpServer.listen(8080);