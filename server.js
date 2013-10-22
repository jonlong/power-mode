var config = require('./config');
var async = require('async');
var log = require('./lib/log');
var Hue = require('node-hue-api').HueApi;
var Room = require('./lib/Room').Room;
var JohnnyFive = require('johnny-five');
var komponist = require('komponist');
var arduinoClient = new JohnnyFive.Board();
var hueClient = new Hue(config.hue.host, config.hue.user);
var devCaveOptions = {};
var devCave;
var button;

async.parallel([
  // Connect to MPD
  function(callback){
    komponist.createConnection(config.mpd.port, config.mpd.host, function(err, client) {
      if (err) {
        log(err);
        callback(err);
      }
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
      log(null, 'Arduino ready');

      // (new JohnnyFive.Led(13)).strobe();
      button = new JohnnyFive.Button(7);
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
  console.log('all functions done');
  devCave = new Room(devCaveOptions);
  devCave.initialize(function(){
    var buttonEnabled = true;
    log(null, 'initialized');

    button.on('down', function(){
      console.log('button pressed');

      if (buttonEnabled) {
        devCave.toggleSwitch();
        buttonEnabled = false;

        setTimeout(function(){
          buttonEnabled = true;
        }, config.buttonTimeout * 1000);
      }

    });
  });
});