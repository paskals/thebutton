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

app.listen(8080, function (){ console.log('Example app listening on port 3000!'); })
