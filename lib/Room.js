var config = require('../config');
var log = require('./log');
var async = require('async');
var lightState = require("node-hue-api").lightState;

var Room = exports.Room = function(options, callback) {
  this.mpd = {
    client: options.mpd,
    status: null
  };
  this.hue = {
    client: options.hue,
    lights: null
  };
};

Room.prototype.initialize = function(callback) {
  var self = this;

  async.parallel([
    // Initialize Music
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
  });
};

Room.prototype.detectHueLights = function(callback) {
  var self = this;
  var client = this.hue.client;

  client.lights()
  .then(function(result){
    self.hue.lights = result.lights;
    callback();
  })
  .done();
};

Room.prototype.changeHue = function(callback) {
  var client = this.hue.client;
  var lights = this.hue.lights;

  // grab the current light status and store it

  for (var i = 0; i < lights.length; i++) {
    var state = lightState.create().on().hsl(240, 100, 46);
    client.setLightState(lights[i].id, state)
    .done();
  }
};

Room.prototype.revertHue = function(callback) {
  // grab the stored status of the hue light and apply it

};

Room.prototype.initializeMusic = function(callback)  {
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
      for (var i = 0; i < playlists.length; i++) {
        var playlist = playlists[i].playlist;
        client.rm(playlist);
        log(null, playlist+' deleted');
      }
      callback(null);
    },
    // Create a new playlist
    function(callback){
      client.add(config.sounds.initial, function(err){
        client.add(config.sounds.background, function(err){
          client.save(config.playlistName, function(err){
            self.playlist = config.playlistName;
            log(null, self.playlist+' created');
            callback(null);
          });
        });
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