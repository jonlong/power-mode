var config = require('../config');
var MPD = require('mpdsocket');
var mpd = new MPD(config.mpd.host, config.mpd.port);

var mpdSend = function(cmd) {
  mpd.send(cmd,function(res) {
    console.log(res);
  });
};

mpd.on('connect',function() {
  console.log('MPD connected');
  mpdSend('status');
});

mpd.on('disconnect', function() {
  console.log('MPD disconnected');
});

mpd.on('error', function(err){
  console.log('MPD error', err);
});

mpd.on('ready',function() {
  mpdSend('status');
  mpdSend('currentsong');
  mpdSend('next');
  mpdSend('playlist');
});

module.exports = mpd;