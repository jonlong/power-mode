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
    lights: null,
    statuses: null
  };
  this.arduino = {
    client: options.arduino,
    occupied: new JohnnyFive.Led({ pin: 13 })
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

Room.prototype.changeHue = function(toggle, callback){
  var self = this;
  var client = this.hue.client;
  var lights = this.hue.lights;
  var statuses = this.hue.statuses || [];

  var setupLight = function(item, callback){
    var state;
    if (toggle == 'revert') {
      var id = item.id - 1;
      state = statuses[id].state;
    } else {
      state = lightState.create().on().hsl(240, 100, 46);
    }

    async.series([
      function(callback){
        // grab the current light status and store it
        client.lightStatus(item.id)
        .then(function(status){
          if (status.state.colormode) {
            delete status.state.colormode;
          }
          if (status.state.reachable) {
            delete status.state.reachable;
          }
          status.state.effect = 'none';
          statuses.push(status);
        })
        .done(function(){
          callback(null);
        });
      },
      function(){
        client.setLightState(item.id, state)
        .done(function(){
          callback(null);
        });
      }
    ],
    function(err){
      if (err) {
        log(null, err);
        callback(err);
        return;
      }
      callback(null);
    });
  };

  async.each(lights, setupLight, function(err){
    log(null, 'Hue changed');
    self.hue.statuses = statuses;
    callback();
  });

};

Room.prototype.setOccupied = function(callback){
  this.arduino.occupied.on();
  log(null, '"Occupied" status set');
  callback();
};

Room.prototype.setUnoccupied = function(callback){
  this.arduino.occupied.off();
  log(null, '"Unoccupied" status set');
  callback();
};

Room.prototype.activate = function(callback){
  var self = this;
  var mpdClient = this.mpd.client;
  if (!callback) {
    callback = function(){};
  }
  log(null, 'Room activated');

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
      self.changeHue('activate', function(err){
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
  var self = this;
  var mpdClient = this.mpd.client;
  if (!callback) {
    callback = function(){};
  }
  log(null, 'Room deactivated');

  async.waterfall([
    // Fade down and stop sounds
    function(callback){
      for (var i = 0; i < 100; i++) {
        var interval = 100 - (i);

        setTimeout(function(){
          mpdClient.setvol(interval);
        }, 20);
      }
      mpdClient.stop();

      callback(null);
    },
    // Revert Overhead lights
    function(callback){
      callback(null);
    },
    // Revert Hue
    function(callback){
      self.changeHue('revert', function(err){
        if (err) {
          log(err);
          callback(err);
          return;
        }
        callback(null);
      });
    },
    // Set as "Unoccupied"
    function(callback){
      self.setUnoccupied(function(){
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