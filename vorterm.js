let _vorpal = require('vorpal');
let ipc = require('node-ipc');

ipc.config.id = 'terminal';
ipc.config.retry = 500;
ipc.config.sync = true;
ipc.config.silent = true;
ipc.config.logger = () => {};


let state = {spells: [], inventory: {opened: false, items: []}};
let jokes = ['abcd'];

// how long it should take for a spell to download, in ms
const SPELL_WAIT = 3 * 1000;

ipc.connectTo('dash', function() {
  ipc.of.dash.on('connect', function() {
    let vorpal = _vorpal();
    let emit = (msg, data) => ipc.of.dash.emit(msg, data);
    let on = (ev, fn) => ipc.of.dash.on(ev, fn);

    on('sync', function(data) { state = JSON.parse(data); })

    on('spell', function({action, spell}) {
      let {name, desc} = spell;
      switch (action) {
        case 'learn':
          state.spells.append(spell);
          vorpal.command('spell ' + name, desc)
              .action(function(args, callback) {
                let msg = '> Opening ' + name + ' spell...';
                let t = 0;
                function draw() {
                  msg = '--' + msg;
                  vorpal.ui.redraw(msg);
                  setTimeout(() => {
                    if (t < SPELL_WAIT) {
                      draw();
                      t = t + (SPELL_WAIT / 30);
                    } else {
                      vorpal.ui.redraw.done();
                    }
                  }, SPELL_WAIT / 30);
                }
              });
      }
    });

    // adds a spell command
    function addSpell(spell, desc, log) {
      desc = desc || 'Equip ' + spell;
      log = log || '--> turning on ' + spell;
      vorpal.command(spell, desc)
          .action(function(args, callback) {
            this.log(log)
            emit(spell);
            return callback();
          })
          .alias('spell ' + spell);
      emit('learn', spell);
    }

    addSpell('water', 'make things wet (voids warranty)')

    addSpell('fireball', 'fire emoji fire emoji fire emoji')

    addSpell('air', 'blow them away with this powerful spell')

    addSpell('revenge', 'does nothing')

    addSpell('jump', 'boing')

    vorpal.command('learn [spell]', 'Learns [spell]')
        .action(function(args, callback) {
          addSpell(args.spell);
          return callback();
        });

    vorpal.command('spell', 'Equip the spell').action(function(args, callback) {
      this.log('i\'m sorry, i don\'t understand what you mean');
      return callback();
    })

    ipc.of.dash.on('ack', () => {});

    // informational commands that are always there
    vorpal.command('flashlight', '🔦 Turns on flashlight')
        .action(function(args, callback) {
          this.log('--> turning on flashlight');
          emit('flashlight');
          callback();
        });

    vorpal.command('inventory', 'Opens app drawer')
        .action(function(args, callback) {
          this.log('^ opening inventory');
          state.inventory.opened = true;
          // emit('inventory');
          callback();
        });


    vorpal.command('fists', '👊').action(function(args, callback) {
      this.log('punchy time');
    })

    vorpal.command('spells', '✅ Lists spells in my memory')
        .action(function(args, callback) {
          this.log(state.spells.join(' '));
          callback();
        });

    vorpal.command('camera', '😐 Take a photo with the front camera')
        .action(function(args, callback) {
          emit('photo', 'front');
          callback();
        });

    vorpal.command('camera back', '📸 Takes a photo with the rear camera')
        .action(function(args, callback) {
          emit('photo', 'rear');
          callback();
        });

    vorpal.command('joke', '😂 😂 😂').action(function(args, callback) {
      this.log('Downloading meme...');
      callback();
      // emit('download', {kind: 'meme'});
    });

    vorpal.delimiter('ciri > ').show();
  });
})
