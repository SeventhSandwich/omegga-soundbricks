<!--

When uploading your plugin to github/gitlab
start your repo name with "omegga-"

example: https://github.com/SeventhSandwich/omegga-SoundBricks

Your plugin will be installed via omegga install gh:SeventhSandwich/SoundBricks

-->

# SoundBricks

A typed safe plugin for [omegga](https://github.com/brickadia-community/omegga).

This plugin allows players to write simple commands through the interact
component to toggle or temporarily play sounds on a brick. Includes the
ability to play beep noises tuned to seven octaves of notes (A0 to B7).

Possible uses/applications:
 - Seven octave keyboard that players can click to play songs.
 - Radio that can be toggled on and off to play music.
 - Brick that can be clicked to alternate between two different songs
 - Sound effects for doorbells, televisions, microwaves, sinks, etc.

 Includes a whitelist mode that limits whose bricks the SoundBrick commands
 will function on.

 Credits:
 - Lythine made the MIDI table that the note sounds are tuned to.
 - FlavouredGames provided loads of testing help.
 - Cake, Voximity, Aware, and other folks in the Omegga discord who provided
 lots of programming help.


## Install

`omegga install gh:SeventhSandwich/SoundBricks`


## Usage

To turn a regular brick into a SoundBrick, add an interact component and navigate
to the console command line at the bottom. The four basic commands you can add are:

**Play a note with a cutoff delay (like a piano)**

sbplay:[note][#][octave]

Examples:

sbplay:A4

sbplay:G#2


**Play a song/sound effect with a cutoff delay**

sbplay:[sound name]

Examples:

sbplay:BA_MUS_Component_APX_Musicbox


**Play a note in toggle mode (will beep on and off like a heart monitor)**

sbtplay:[note][#][octave]


**Play a song/sound effect in toggle mode**

sbtplay:[sound name]


**Other commands you can add on top of the previous four are:**

sbv:[VolumeMultiplier]

sbp:[PitchMultiplier]

sbd:[Cutoff Delay]

sbr:[Inner Radius]

sbm:[Max Distance]

sbs:[Spatialization (true/false)]


Example: To play an A4 with 0.5 volume, 200ms cutoff delay, 20 unit radius, 200 unit max distance, and spatialization off:

sbplay:A4 sbv:0.5 sbd:200 sbr:20 sbm:200 sbs:false

## "The interact command line is too short for the command I want!"

In the likely event that you want to play some lengthy song name with a bunch of
extra settings, the 50 character line capacity is probably too small.

So long as you want it to be in toggle mode, you can work around this by setting
your brick's audio component to the desired sound, and then adding this to the command line:

sbtplay:BA_NONE

Which will toggle the brick's sound off. You can also replace 'BA_NONE' with an actual
music track to make a brick that can play one of either two songs and switch between them.

## Note/warning on toggled sounds

To store brick component information for toggled sound effects, this plugin hashes
the brick's data and uses it to store the brick's information when it is toggled OFF.
This data is not carried with your save.

Always save your build with the bricks in the toggled OFF mode to ensure that the
SoundBrick behaves consistently. A brick that is toggled ON will have a string
in the format of sbt{[lots of numbers]} in the interact component console command line.

## An incomplete list of valid sound names

At least for now, this plugin requires a strictly correct sound name.
I don't have a full list of all the sounds, but it is pretty easy to guess them from the short name.
To make it easier, here is a partial list of all the sounds in Brickadia:
```
BA_AirRaidSiren1
BA_AMB_Component_Alarm_Scifi_Creepy
BA_AMB_Component_Alarm_Scifi_Warning_1
BA_AMB_Component_Alarm_Scifi_Warning_2
BA_AMB_Component_Alarm_Scifi_Warning_3
BA_NeonLight1
BA_AMB_Component_Air_Conditioning_Buzzy_1
BA_AMB_Component_Air_Conditioning_Buzzy_2
BA_AMB_Component_Air_Conditioning_Grungy
BA_AMB_Component_Air_Conditioning_Wobbly
BA_AMB_Component_Fires_Fireplace_1
BA_AMB_Component_Hospital_Misc_Respirator
BA_AMB_Component_Hospital_Monitors_Heart_1
BA_AMB_Component_Hospital_Monitors_Heart_2
BA_AMB_Component_Hospital_Monitors_Heart_3
BA_AMB_Component_Automated_Vending
BA_RadioStatic1
BA_Old_Computer
BA_Printer
BA_MUS_Component_Custard
BA_MUS_Component_El_Duo
BA_MUS_Component_Fountaintail
BA_MUS_Component_Solution_Not_Forthcoming
BA_MUS_Component_Morning_Dream
BA_MUS_Component_Thunderpunch_A
BA_MUS_Component_Thunderpunch_B
BA_MUS_Component_Thunderpunch_Drone
BA_MUS_Component_OST_90s
BA_MUS_Component_OST_Aesthetics
BA_MUS_Component_OST_Drifting_in_Space
BA_MUS_Component_OST_Familiar
BA_MUS_Component_OST_Frozen_Moo
BA_MUS_Component_OST_Hard_Bass
BA_MUS_Component_OST_Imposter
BA_MUS_Component_OST_Pensive
BA_MUS_Component_OST_SoundsGood
BA_MUS_Component_OST_Spunky
BA_MUS_Component_OST_Strategize
BA_MUS_Component_OST_Vibe
BA_MUS_Component_Retro_Boss
BA_MUS_Component_Retro_Menu
BA_MUS_Component_Retro_Stage_1
BA_MUS_Component_Retro_Stage_2
BA_MUS_Component_Retro_Stage_3
BA_MUS_Component_Retro_Stage_4
BA_MUS_Component_Retro_Stage_5
BA_Water_Flowing_Calm
BA_Water_Flowing_Fountain
BA_Water_Flowing_Waterfall
BA_Water_Flowing_Waves
```
