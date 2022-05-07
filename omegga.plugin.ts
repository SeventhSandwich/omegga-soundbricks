import OmeggaPlugin, { OL, PS, PC } from 'omegga';

type Config = { foo: string };
type Storage = { bar: string };

const { getScaleAxis } = OMEGGA_UTIL.brick;
const { getBrickSize } = OMEGGA_UTIL.brick;

export default class Plugin implements OmeggaPlugin<Config, Storage> {
  omegga: OL;
  config: PC<Config>;
  store: PS<Storage>;

  constructor(omegga: OL, config: PC<Config>, store: PS<Storage>) {
    this.omegga = omegga;
    this.config = config;
    this.store = store;
  }

  async init() {
    this.clickedBricks = []; //store bricks temporarily to prevent double clicking
    this.stalledPlayers = []; //store player names for 50ms to halt autoclickers

    this.omegga.on('interact', async ({ player, message, position }) => {
      if (message.length === 0) return;

      if (this.stalledPlayers.includes(player.name)) {
        return;
      } else {
        this.stallInteract(player.name);
      }

      if (message.match(/^.*sbplay.*$/i) == null && message.match(/^.*sbt.*$/i)==null) return;

      if (this.clickedBricks.length != 0) {
        if (position[0]==this.clickedBricks[0][0] && position[1]==this.clickedBricks[0][1] && position[2]==this.clickedBricks[0][2]) {
          return {};
        }
      }
      //get info about our brick and the sound preferences in the message
      const [soundBrickData,saveData] = await this.findClickedBrick(position)
      let soundBrickSize = [soundBrickData.size[getScaleAxis(soundBrickData, 0)], soundBrickData.size[getScaleAxis(soundBrickData, 1)], soundBrickData.size[getScaleAxis(soundBrickData, 2)]];
      //check if we have to use the size map to get the brick's size
      if (soundBrickData.size[0]==0 && soundBrickData.size[1]==0 && soundBrickData.size[2]==0) {
        soundBrickSize = getBrickSize(soundBrickData, saveData.brick_assets);
      }

      if (this.config["Whitelist Mode"]) {
        let soundBrickOwner = saveData.brick_owners[soundBrickData.owner_index-1].name;
        if (!Omegga.getPlayer(soundBrickOwner).isHost()) {
          if (!this.config['Whitelisted Players'].some(p => Omegga.getPlayer(soundBrickOwner).id === p.id)) {
            Omegga.whisper(player,`Whitelist mode is enabled. Only whitelisted players can place SoundBricks.`);
            return [];
          }
        }
      }

      let prefs = await this.getPreferences(message);

      //brick to play a note with a cutoff delay
      let match = message.match(
        /^.*sbplay:(?<note>[A-G])(?<sharp>#)?(?<octave>[0-7]).*$/i
      );
      if (match) {
        //match and update sound preferences, if applicable
        this.clickedBricks.push(position as Vector);
        await this.playNote(soundBrickData,saveData,soundBrickSize,match,prefs);
        this.clickedBricks.splice(this.clickedBricks.indexOf(position),1);
        return {};
      }
      //brick to play a note on toggle mode
      match = message.match(
        /^.*sbtplay:(?<note>[A-G])(?<sharp>#)?(?<octave>[0-7]).*$/i
      );
      if (match) {
        prefs.Toggle = true;
        this.clickedBricks.push(position as Vector);
        await this.playNote(soundBrickData,saveData,soundBrickSize,match,prefs);
        this.clickedBricks.splice(this.clickedBricks.indexOf(position),1);
        return {};
      }
      //brick to play a preset sound track with a cutoff delay
      match = message.match(
        /^.*sbplay:BA_(?<sound>\w*).*$/i
      );
      if (match) {
        this.clickedBricks.push(position as Vector);
        await this.playSound(soundBrickData,saveData,soundBrickSize,match,prefs);
        this.clickedBricks.splice(this.clickedBricks.indexOf(position),1);
        return {};
      }
      //brick to play a preset sound track on toggle mode
      match = message.match(
        /^.*sbtplay:BA_(?<sound>\w*).*$/i
      );
      if (match) {
        prefs.Toggle = true;
        this.clickedBricks.push(position as Vector);
        await this.playSound(soundBrickData,saveData,soundBrickSize,match,prefs);
        this.clickedBricks.splice(this.clickedBricks.indexOf(position),1);
        return {};
      }
      //return a toggled brick back to its original state
      match = message.match(
        /^.*sbt:{(?<hashedInteract>.*)}.*$/i
      )
      if (match) {
        this.clickedBricks.push(position as Vector);
        await this.untoggleBrick(soundBrickData,saveData,soundBrickSize,match.groups.hashedInteract);
        this.clickedBricks.splice(this.clickedBricks.indexOf(position),1);
        return {};
      }
    });
    return { registeredCommands: [] };
  }

  findClickedBrick = async (position) => {
    //special thanks to voximity for explaining this trick
    const searchRegion = {
      center: position as Vector,
      extent: [
        500,
        500,
        500,
      ] as Vector,
    };
    const saveData = await Omegga.getSaveData(searchRegion);
    if (typeof saveData == "undefined") {
      //failed to find any bricks in the entire search region. Something is wrong!
      console.log(`SoundBricks: findClickedBrick() failed to return any brick data.`);
      return {};
    } else {
      const clickedBrick = saveData.bricks.find(b => b.position[0] === position[0] && b.position[1] === position[1] && b.position[2] === position[2]);
      if (clickedBrick == null) {
        console.log(`SoundBricks: findClickedBrick() failed to find the clicked brick.`);
        return {};
      } else {
        return [clickedBrick,saveData];
      }
    }
  }
  getPreferences = async(message) => {
    const prefs = {
      AudioDescriptor: "",
      VolumeMultiplier: 2.0,
      PitchMultiplier: 1.0,
      InnerRadius: 15.0,
      MaxDistance: 400.0,
      bSpatialization: true,
      Delay: 125,
      Toggle: false,
    };

    let matchPref = message.match(
      /^.*sbd:(?<delay>\d+).*/i
    )
    if (matchPref) {
      prefs.Delay = matchPref.groups.delay;
      if (prefs.Delay > this.config["Maximum Sound Length (ms)"]) {
        prefs.Delay = this.config["Maximum Sound Length (ms)"]; //cap sound length
      }
    }

    matchPref = message.match(
      /^.*sbv:(?<volume>[0,1,2](?:.\d+)?).*/i
    )
    if (matchPref) {
      prefs.VolumeMultiplier = Number.parseFloat(matchPref.groups.volume);
    }

    matchPref = message.match(
      /^.*sbp:(?<pitch>[0,1,2](?:.\d+)?).*/i
    )
    if (matchPref) {
      prefs.PitchMultiplier = Number.parseFloat(matchPref.groups.pitch);
      if (prefs.PitchMultiplier < 0.4) {
        prefs.PitchMultiplier = 0.4;
      } else if (prefs.PitchMultiplier > 2) {
        prefs.PitchMultiplier = 2.0;
      }
    }

    matchPref = message.match(
      /^.*sbr:(?<radius>\d+(?:.\d+)?).*/i
    )
    if (matchPref) {
      prefs.InnerRadius = Number.parseFloat(matchPref.groups.radius);
      if (prefs.InnerRadius < 10) {
        prefs.InnerRadius = 10;
      } else if (prefs.InnerRadius > 100) {
        prefs.InnerRadius = 100;
      }
    }

    matchPref = message.match(
      /^.*sbm:(?<distance>\d+(?:.\d+)?).*/i
    )
    if (matchPref) {
      prefs.MaxDistance = Number.parseFloat(matchPref.groups.distance);
      if (prefs.MaxDistance < 10) {
        prefs.MaxDistance = 10;
      } else if (prefs.MaxDistance > 400) {
        prefs.MaxDistance = 400;
      }
    }

    matchPref = message.match(
      /^.*sbs:(?<spatial>\w+)?.*/i
    )
    if (matchPref) {
      if (matchPref.groups.spatial=="true") {
        prefs.bSpatialization = true;
      } else if (matchPref.groups.spatial=="false") {
        prefs.bSpatialization = false;
      }
    }

    return JSON.parse(JSON.stringify(prefs));
  }

  playSound = async(brick,saveData,brickSize,match,prefs) => {
    let origBrick = JSON.parse(JSON.stringify(brick)); //save our brick
    //create our audio component
    brick.components.BCD_AudioEmitter = {
          AudioDescriptor: "BA_"+match.groups.sound,
          VolumeMultiplier: prefs.VolumeMultiplier,
          PitchMultiplier: prefs.PitchMultiplier,
          InnerRadius: prefs.InnerRadius,
          MaxDistance: prefs.MaxDistance,
          bSpatialization: prefs.bSpatialization,
    };
    //temporarily clear interact tag
    let origTag = JSON.parse(JSON.stringify(brick.components.BCD_Interact.ConsoleTag));
    if (prefs.Toggle) {
      //toggle mode
      let hashedInteract = await this.cyrb53(origTag+brick.position[0]+brick.position[1]+brick.position[2]);
      brick.components.BCD_Interact.ConsoleTag = "sbt:{"+hashedInteract+"}";
      await this.store.set(String(hashedInteract),JSON.stringify(origBrick));
      await Omegga.clearRegion({center: brick.position, extent: brickSize});
      await Omegga.loadSaveData({ ...saveData, bricks:[brick], components:undefined},{quiet: true});
    } else {
      //cutoff delay mode
      brick.components.BCD_Interact.ConsoleTag = "";
      await Omegga.clearRegion({center: brick.position, extent: brickSize});
      await Omegga.loadSaveData({ ...saveData, bricks:[brick], components:undefined},{quiet: true});
      await new Promise(resolve => setTimeout(resolve, prefs.Delay));
      await Omegga.clearRegion({center: brick.position, extent: brickSize});
      await Omegga.loadSaveData({ ...saveData, bricks:[origBrick]},{quiet: true});
    }
  }

  playNote = async(brick,saveData,brickSize,match,prefs) => {
    //pitch table courtesy of Lythine's Omegga midi player
    //(https://github.com/Lythine/omegga-midiplayer)
    let pitchTable = {
    "bassThreshold": 47,
    "upperThreshold": 77,
    "A0": 0.45, // 19 - 47 Are only meant to be used for BA_MUS_Component_Thunderpunch_Drone
    "A#0": 0.47,
    "B0": 0.5,
    "C1": 0.53,
    "C#1": 0.56,
    "D1": 0.59,
    "D#1": 0.63,
    "E1": 0.67,
    "F1": 0.71,
    "F#1": 0.75,
    "G1": 0.79,
    "G#1": 0.84,
    "A1": 0.89,
    "A#1": 0.94,
    "B1": 1,
    "C2": 1.06,
    "C#2": 1.12,
    "D2": 1.19,
    "D#2": 1.26,
    "E2": 1.33,
    "F2": 1.41,
    "F#2": 1.49,
    "G2": 1.59,
    "G#2": 1.67,
    "A2": 1.78,
    "A#2": 1.88,
    "B2": 2,
    "C3": 0.4, // 48 - 76 Are only meant to be used for BA_AMB_Component_Hospital_Monitors_Heart_3
    "C#3": 0.42,
    "D3": 0.45,
    "D#3": 0.47,
    "E3": 0.5,
    "F3": 0.53,
    "F#3": 0.56,
    "G3": 0.59,
    "G#3": 0.63,
    "A3": 0.67,
    "A#3": 0.71,
    "B3": 0.75,
    "C4": 0.79,
    "C#4": 0.84,
    "D4": 0.89,
    "D#4": 0.94,
    "E4": 1,
    "F4": 1.06,
    "F#4": 1.12,
    "G4": 1.18,
    "G#4": 1.26,
    "A4": 1.34,
    "A#4": 1.41,
    "B4": 1.5,
    "C5": 1.59,
    "C#5": 1.68,
    "D5": 1.78,
    "D#5": 1.88,
    "E5": 2,
    "F5": 1.39, // 77 - 78 Are only meant to be used for BA_AMB_Component_Hospital_Monitors_Heart_3
    "F#5": 1.47,
    "G5": 0.41, // 79 - 107 Are only meant to be used for BA_AMB_Component_Hospital_Monitors_Heart_1
    "G#5": 0.43,
    "A5": 0.46,
    "A#5": 0.48,
    "B5": 0.51,
    "C6": 0.54,
    "C#6": 0.57,
    "D6": 0.61,
    "D#6": 0.65,
    "E6": 0.69,
    "F6": 0.73,
    "F#6": 0.77,
    "G6": 0.82,
    "G#6": 0.86,
    "A6": 0.92,
    "A#6": 0.97,
    "B6": 1.03,
    "C7": 1.09,
    "C#7": 1.15,
    "D7": 1.22,
    "D#7": 1.29,
    "E7": 1.37,
    "F7": 1.46,
    "F#7": 1.54,
    "G7": 1.64,
    "G#7": 1.72,
    "A7": 1.83,
    "A#7": 1.91,
    "B7": 2
    }

    let pitch = "";
    if (match.groups.sharp=="#") {
      pitch = match.groups.note+"#"+match.groups.octave
    } else {
      pitch = match.groups.note+match.groups.octave
    }

    let origBrick = JSON.parse(JSON.stringify(brick)); //save our brick
    //create our audio component
    brick.components.BCD_AudioEmitter = {
          AudioDescriptor: prefs.AudioDescriptor,
          VolumeMultiplier: prefs.VolumeMultiplier,
          PitchMultiplier: pitchTable[pitch],
          InnerRadius: prefs.InnerRadius,
          MaxDistance: prefs.MaxDistance,
          bSpatialization: prefs.bSpatialization,
    };
    //temporarily clear interact tag
    let origTag = JSON.parse(JSON.stringify(brick.components.BCD_Interact.ConsoleTag));
    brick.components.BCD_Interact.ConsoleTag = "";

    //narrow down which sound we're supposed to use. this could use some cleanup
    if (["0","1","2"].includes(match.groups.octave)) {
      brick.components.BCD_AudioEmitter.AudioDescriptor = "BA_MUS_Component_Thunderpunch_Drone";
    } else if (["3","4"].includes(match.groups.octave)) {
      //brick.components.BCD_AudioEmitter.AudioDescriptor = "BA_MUS_Component_APX_Musicbox";
      brick.components.BCD_AudioEmitter.AudioDescriptor = "BA_AMB_Component_Hospital_Monitors_Heart_2";
    } else {
      if (["C","D","E"].includes(match.groups.note)) {
        brick.components.BCD_AudioEmitter.AudioDescriptor = "BA_AMB_Component_Hospital_Monitors_Heart_2";
      } else if (["F5","F#5"].includes(pitch)) {
        brick.components.BCD_AudioEmitter.AudioDescriptor = "BA_AMB_Component_Hospital_Monitors_Heart_3";
      } else {
        brick.components.BCD_AudioEmitter.AudioDescriptor = "BA_AMB_Component_Hospital_Monitors_Heart_1";
      }
    }
    if (prefs.Toggle) {
      //toggle mode
      let hashedInteract = await this.cyrb53(origTag+brick.position[0]+brick.position[1]+brick.position[2]);
      brick.components.BCD_Interact.ConsoleTag = "sbt:{"+hashedInteract+"}";
      await this.store.set(String(hashedInteract),JSON.stringify(origBrick));
      await Omegga.clearRegion({center: brick.position, extent: brickSize});
      await Omegga.loadSaveData({ ...saveData, bricks:[brick], components:undefined},{quiet: true});
    } else {
      //cutoff delay mode
      await Omegga.clearRegion({center: brick.position, extent: brickSize});
      await Omegga.loadSaveData({ ...saveData, bricks:[brick], components:undefined},{quiet: true});
      await new Promise(resolve => setTimeout(resolve, prefs.Delay));
      await Omegga.clearRegion({center: brick.position, extent: brickSize});
      await Omegga.loadSaveData({ ...saveData, bricks:[origBrick]},{quiet: true});
    }
  }

  untoggleBrick = async (brick,saveData,brickSize,hashedInteract) => {
    let origBrickJSON = await this.store.get(hashedInteract);
    await this.store.delete(hashedInteract);
    let origBrick = JSON.parse(origBrickJSON);
    await Omegga.clearRegion({center: brick.position, extent: brickSize});
    await Omegga.loadSaveData({ ...saveData, bricks:[origBrick]},{quiet: true});
  }

  stallInteract = async (playerName) => {
    this.stalledPlayers.push(playerName);
    await new Promise(resolve => setTimeout(resolve, 50));
    this.stalledPlayers.splice(this.stalledPlayers.indexOf(playerName),1);
    return;
  }

  cyrb53 = async (str, seed = 0) => {
    //I stole this off of bryc on stackoverflow. I have no idea how it works
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
    h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1>>>0);
  }

  async stop() {
    // Anything that needs to be cleaned up...
  }
}
