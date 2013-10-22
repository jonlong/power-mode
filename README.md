#Power Mode

##What You'll Need
- A [Raspberry Pi](http://raspberrypi.org)
- An Arduino, or [alaMode](http://www.makershed.com/AlaMode_for_Raspberry_Pi_p/mkwy1.htm) board
- A set of [Philips Hue lights](http://www.meethue.com) (to control the automatic lighting feature)
- Speakers with a 3.5mm adapter for the Pi's audio-out jack
- A hardware button to trigger it all
- An optional [wifi adapter](http://www.newegg.com/Product/Product.aspx?Item=N82E16833315091) for wireless connectivity
- An optional [console cable](http://www.adafruit.com/products/954) to ease the headache of setting up the Pi (no external keyboard/mouse/monitor required)

##Setup

###Raspberry Pi

Grab the latest copy of Raspbian [here](http://www.raspberrypi.org/downloads) and follow the installation instructions. Once you're connected, run `raspi-config` and enable ssh.  If you've got an external monitor connected to your Pi, you can use the GUI interface to set your wifi configuration. If you're planning on sticking with the command line, you can find instructions for setting the wifi config [here](http://learn.adafruit.com/adafruits-raspberry-pi-lesson-3-network-setup/setting-up-wifi-with-occidentalis).

Once that's up and running, you'll need to install node.js. There's a great tutorial [here](http://blog.rueedlinger.ch/2013/03/raspberry-pi-and-nodejs-basic-setup/) that will walk you through it, but the real thing to remember is not to compile node.js on the Pi itself, and instead download the [pre-compiled ARM binaries](http://nodejs.org/dist) from nodejs.org. Using the binaries will save *hours* of compiling.

Once node is up and running, you'll want to install MPD and MPC. MPD is a linux-based music player, and MPC is a client interface that lets you control the MPD daemon. Instructions for preliminary setup are [here](http://miro.oorganica.com/raspberry-pi-mpd/).

**Warning:** MPD setup is far and away the biggest pain in this whole process. I've provided a config inside the `.mpd` folder that should help ease the awful, but if you run into trouble, make sure to consult [this resource](http://mpd.wikia.com/wiki/Music_Player_Daemon_HOWTO_Troubleshoot) before diving into a black hole of Googling awful Linux forums.

Finally, copy this repo to your `/home/pi` folder and run `npm install` to grab the project's dependencies.

##Thanks
A huge thank you to [iStrategyLabs](http://github.com/istrategylabs) for letting me work on/prototype this in the office. You guys rule.