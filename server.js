var config = require('./config');
var async = require('async');
var log = require('./lib/log');
var Hue = require('node-hue-api').hue;
var Room = require('./lib/Room').Room;
var JohnnyFive = require('johnny-five');
var komponist = require('komponist');
var arduinoClient = new JohnnyFive.Board();
var hueClient = new Hue.HueApi(config.hue.host, config.hue.user);
var devCaveOptions = {};
var devCave;

async.parallel([
  // Connect to MPD
  function(callback){
    komponist.createConnection(config.mpd.port, config.mpd.host, function(err, client) {
      devCaveOptions.mpd = client;
      log(null, 'MPD client connected');
      callback(null, client);
    });
  },
  // Connect to Hue
  function(callback){
    hueClient.connect()
    .then(function(result){
      devCaveOptions.hue = hueClient;
      log(null, 'Hue client connected');
      callback(null, result);
    })
    .done();
  },
  // Wait for the arduino to connect
  function(callback){
    devCaveOptions.arduino = arduinoClient;
    arduinoClient.on('ready', function(){
      callback(null);
    });
  }
],
// After all functions are complete
function(err, results){
  if (err) {
    log(err);
    return;
  }

  devCave = new Room(devCaveOptions);
  devCave.initialize(function(){
    devCave.activate();
  });
});