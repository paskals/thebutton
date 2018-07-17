var fs = require('fs');
var http = require('http');
var https = require('https');
var privateKey  = fs.readFileSync('../../private.key', 'utf8');
var certificate = fs.readFileSync('../../thebutton_co.crt', 'utf8');

var credentials = {key: privateKey, cert: certificate};

var express = require('express');
var app = express();
var path = require('path');
app.use(express.static('./'));

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, './index.html'));
});

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(8080);
httpsServer.listen(8443);