var config = {
  mpd: {
    host: '127.0.0.1',
    port: '6600'
  },
  hue: {
    host: 'IP_ADDRESS',
    port: '80',
    user: 'USER_ID',
    group: {
      name: 'GROUP_NAME',
      state: {
        // http://developers.meethue.com/2_groupsapi.html#252_body_arguments
        "on": true,
        "hue": COLOR_CODE_HERE,
        "effect": "none"
      }
    }
  },
  sounds: {
    initial: 'powerdown.mp3',
    background: 'bridgeambiance.mp3'
  },
  playlistName: 'PLAYLIST_NAME',
  buttonTimeout: 5 //after a push, how long until button is active again, in seconds
};

module.exports = config;