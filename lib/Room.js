var config = require('../config');
var log = require('./log');
var async = require('async');
var JohnnyFive = require('johnny-five');
var lightState = require("node-hue-api").lightState;

var Room = exports.Room = function(options, callback) {
  this.active = false;
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
      self.initializeHue(function(err){
        if (err) {
          callback(err);
        }

        callback(null);
      });
    }],
  function(err, results){
    if (err) {
      log(err);
      return;
    }
    log(null, 'Room initialized');
    callback();
  });

};

Room.prototype.initializeHue = function(callback){
  var self = this;
  var client = this.hue.client;

  async.waterfall([
    function(callback){
      // Try to determine if the correct hue group exists
      self.detectHueGroups(function(err, groupId){
        if (err) {
          log(err);
          callback(err);
        }

        callback(null, groupId);
      });
    },
    function(groupId, callback){

      console.log('GROUP ID: ', groupId);
      // Make the group if it does not exist, otherwise move on
      if (!groupId) {
        self.createHueGroup(function(err, groupId){
          // set the group id
          self.hue.groupId = groupId;
          callback(null, groupId);
        });
      } else {
        callback(null);
      }
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

Room.prototype.detectHueGroups = function(callback){
  var self = this;
  var client = this.hue.client;
  var groupName = config.hue.group.name;

  client.groups()
  .then(function(groups){
    self.hue.groups = groups;
    console.log('detected groups', groups);
    var roomGroup = groups.filter(function (group) { return group.name == groupName; });
    self.hue.groupId = roomGroup.length === 0 ? false : roomGroup[0].id;
    callback(null, self.hue.groupId);
  })
  .fail(function(err){
    log(err);
    callback(err);
  })
  .done();
};

Room.prototype.createHueGroup = function(callback){
  var self = this;
  var client = this.hue.client;
  var groupName = config.hue.group.name;

  self.detectHueLights(function(){
    client.createGroup(groupName, self.hue.lightIds)
    .then(function(group){
      console.log('group', group);
      var groupId = group.id;
      callback(null, groupId);
    })
    .fail(function(err){
      log(err);
      callback(err);
    })
    .done();
  });

};

Room.prototype.detectHueLights = function(callback){
  var self = this;
  var client = this.hue.client;

  client.lights()
  .then(function(result){
    self.hue.lights = result.lights;

    self.hue.lightIds = result.lights.map(function(light){
      return light.id;
    });

    log(null, 'Hue lights detected');
    console.log('detecthuelights', self.hue.lightIds);
    callback(null);
  })
  .fail(function(err){
    log(err);
    callback(err);
  })
  .done(function(){
    console.log('huelights done');
  });
};

Room.prototype.changeHue = function(toggle, callback){
  var self = this;
  var client = this.hue.client;
  var lights = this.hue.lightIds;
  var lastAction = this.hue.lastAction;
  var groupId = this.hue.groupId;
  var state;

  if (toggle == 'revert') {
    state = lastAction;
  } else {
    state = config.hue.group.state;
  }

  async.series([
    function(callback){
      // grab the current group status and store it
      client.getGroup(groupId)
      .then(function(status){
        if (status.lastAction.colormode) {
          delete status.lastAction.colormode;
        }
        if (status.lastAction.reachable) {
          delete status.lastAction.reachable;
        }
        status.lastAction.effect = 'none';
        self.hue.lastAction = status.lastAction;
      })
      .fail(function(err) {
        log(null, err);
      })
      .done(function() {
        callback(null);
      });
    },
    // set the new group status
    function(){
      log(null, 'setlightstate');
      console.log('The group id: ', groupId);
      client.setGroupLightState(groupId, state, true)
      .fail(function(err) {
        log(null, err);
      })
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

Room.prototype.toggleSwitch = function(callback){
  console.log('this.active', this.active);
  if (this.active) {
    this.deactivate();
  } else {
    this.activate();
  }
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
  self.active = true;
  if (!callback) {
    callback = function(){};
  }
  log(null, 'Room activated');

  async.waterfall([
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
    // Trigger initialize sound
    function(callback){
      mpdClient.setvol(100);
      mpdClient.repeat(0);
      mpdClient.single(0);
      // mpdClient.setvol(100);   // Doesn't seem to work
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
    // Set as "Occupied"
    function(callback){
      self.setOccupied(function(){
        callback(null);
      });
    },
    // Change Overhead lights
    function(callback){
      callback(null);
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
  self.active = false;
  if (!callback) {
    callback = function(){};
  }
  log(null, 'Room deactivated');

  async.waterfall([
    // Fade down and stop sounds
    function(callback){
      var count = 100;
      var counter = setInterval(timer, 10);

      function timer() {
        count = count-2;
        if (count <= 0) {
           clearInterval(counter);
           //counter ended, do something here
            mpdClient.stop();
            callback(null);
           return;
        }
        mpdClient.setvol(count);
      }
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
    function(callback) {
      console.log('stop');

      client.stop(function(err) {
        console.log('client stopped');
        if (err) {
          log(err);
          callback(err);
          return;
        }
        callback(null);
      });
    },
    function(callback){
      // List all the current playlists
      console.log('listplaylists');

      client.listplaylists(function(err, playlists) {
        if (err) {
          log(err);
          callback(err);
          return;
        }
        callback(null, playlists);
      });
    },
    // Delete all those playlists
    function(playlists, callback){
        console.log('deleteplaylists');

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
        console.log('databaseupdate');

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
        console.log('clearplaylist');

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
        console.log('createplaylist');

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
      console.log('loadplaylist');
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
