var config = require('../config');
var hue = require('node-hue-api').hue;
var hostname = config.hue.host;
var username = config.hue.user;
var api;

var displayResult = function(result) {
    console.log(JSON.stringify(result, null, 2));
};

api = new hue.HueApi(hostname, username);
api.connect().done();

module.exports = api;