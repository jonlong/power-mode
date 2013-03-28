var config = require('../config');
var log = require('./log');
var async = require('async');
var JohnnyFive = require('johnny-five');
var lightState = require("node-hue-api").lightState;

var Room = exports.Room = function(options, callback) {
  this.mpd = {
    client: options.mpd,
    status: null,
    playlist: null
  };
  this.hue = {
    client: options.hue,
    lights: null
  };
  this.arduino = {
    client: options.arduino
  };
};

Room.prototype.initialize = function(callback) {
  var self = this;

  async.parallel([
    // Initialize Sound
    function(callback){
      self.initializeMusic(function(){
        callback(null);
      });
    },
    // Detect Hue Lights
    function(callback){
      self.detectHueLights(function(){
        callback(null);
      });
    }],
  function(err, results){
    if (err) {
      log(err);
      return;
    }
    callback();
    log(null, 'Room initialized');
  });
};

Room.prototype.detectHueLights = function(callback){
  var self = this;
  var client = this.hue.client;

  client.lights()
  .then(function(result){
    self.hue.lights = result.lights;
    callback();
  })
  .done();

  log(null, 'Hue lights detected');
};

Room.prototype.changeHue = function(callback){
  var client = this.hue.client;
  var lights = this.hue.lights;

  // grab the current light status and store it

  for (var i = 0; i < lights.length; i++) {
    var state = lightState.create().on().hsl(240, 100, 46);
    client.setLightState(lights[i].id, state)
    .done();
  }
  log(null, 'Hue changed');
  callback();
};

Room.prototype.revertHue = function(callback){
  // grab the stored status of the hue light and apply it

};

Room.prototype.setOccupied = function(callback){
  var client = this.arduino.client;
  var led = new JohnnyFive.Led({
    pin: 13
  });

  led.on();
  log(null, '"Occupied" status set');
};

Room.prototype.setUnoccupied = function(callback){
  log(null, '"Unoccupied" status set');
};

Room.prototype.activate = function(callback){
  var self = this;
  var mpdClient = this.mpd.client;

  async.waterfall([
    // Trigger initialize sound
    function(callback){
      mpdClient.repeat(0);
      mpdClient.single(0);
      mpdClient.play(0, function(){
        mpdClient.playlistinfo(function(err, info){
          if (err) {
            log(err);
            return;
          }
          //Length of first sound in seconds
          var firstSoundLength = info[0].Time;
          setTimeout(function(){
            mpdClient.repeat(1);
            mpdClient.single(1);
          }, (firstSoundLength * 1000) + 200);
          log(null, 'sounds playing');
          callback(null);
        });
      });
    },
    // Change Overhead lights
    function(callback){
      callback(null);
    },
    // Change Hue
    function(callback){
      self.changeHue(function(err){
        if (err) {
          log(err);
          callback(err);
          return;
        }
        callback(null);
      });
    },
    // Set as "Occupied"
    function(callback){
      self.setOccupied(function(){
        callback(null);
      });
    }
  ],
  function(err, result){
    if (err) {
      log(err);
      callback(err);
      return;
    }
    callback(null);
  });
};

Room.prototype.deactivate = function(callback){
  
};

Room.prototype.initializeMusic = function(callback){
  var self = this;
  var client = this.mpd.client;

  // Wipe and rebuild the playlist
  async.waterfall([
    function(callback){
      // List all the current playlists
      client.listplaylists(function(err, playlists){
        callback(null, playlists);
      });
    },
    // Delete all those playlists
    function(playlists, callback){
      if (!Array.isArray(playlists)) {
        if (playlists.playlist) {
          // There's only one
          playlists = new Array(playlists);
        } else {
          // There are none
          callback(null);
          return;
        }
      }

      for (var i = 0; i < playlists.length; i++) {
        var playlist = playlists[i].playlist;
        client.rm(playlist, function(err){
          if (err) {
            log(err);
            callback(err);
            return;
          }
          log(null, playlist+' deleted');
        });
      }
      callback(null);
    },
    function(callback){
      // Run a database update
      client.update(function(err){
        if (err) {
          log(err);
          callback(err);
          return;
        }
        callback(null);
      });
    },
    function(callback){
      // Clear MPD's current playlist
      client.clear(function(err){
        if (err) {
          log(err);
          callback(err);
          return;
        }
        callback(null);
      });
    },
    // Create a new playlist
    function(callback){
      client.add(config.sounds.initial, function(err){
        if (err) {
          callback(err);
          return;
        }
        client.add(config.sounds.background, function(err){
          if (err) {
            callback(err);
            return;
          }
          client.save(config.playlistName, function(err){
            self.playlist = config.playlistName;
            if (err) {
              callback(err);
              return;
            }
            log(null, self.playlist+' created');
            callback(null);
          });
        });
      });
    },
    // Load the new playlist
    function(callback){
      client.load(self.playlist, function(err){
        if (err) {
          callback(err);
          return;
        }
        log(null, 'playlist loaded');
        callback(null);
      });
    }
  ],
  function(err, result){
    if (err) {
      log(err);
      callback(err);
      return;
    }
    callback(null);
  });
};