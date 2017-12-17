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
    let cancelDownload = false;

    function loading_bar(args, wait, callback) {
      let msg = '> ' + args + ' spell...';
      let t = 0;
      function draw() {
        msg = '--' + msg;
        vorpal.ui.redraw(msg);
        setTimeout(() => {
          if (t < wait && !cancelDownload) {
            draw();
            t = t + (wait / 30);
          } else {
            cancelDownload = false;
            vorpal.ui.redraw.done();
            callback();
          }
        }, wait / 30);
      }
      draw();
    }

    on('no wifi', function(msg) {
      this.log(' no wifi, spells will be sent over cellular data...\n');
      vorpal.delimiter('cir (no wifi) > ').show();
    });

    on('sending failed', function() {
      cancelDownload = true;
      this.log(' *** spell sending failed! please try again *** ')
    });

    on('wifi', function() { vorpal.delimiter('cir > ').show(); });

    on('sync', function(data) {

      let new_state = JSON.parse(data);
      if (new_state.wifi < 10 && state.wifi > 10) {
        vorpal.log(
            ' ** no wifi, spells will be sent over cellular data... ** \n');
        vorpal.delimiter('ciri (no wifi) > ').show();
      } else if (new_state.wifi > 10 & state.wifi < 10) {
        vorpal.delimiter('ciri > ');
      }
      state = new_state;
    });

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

    function checkWifi(spellEmit, callback) {
      if (state.wifi >= 10 * Math.random() || Math.random() > 0.3) {
        loading_bar('sending', SPELL_WAIT * Math.random(), () => {
          spellEmit();
          return callback();
        });
      } else {
        loading_bar('sending', SPELL_WAIT * Math.random() * 3.0, () => {
          vorpal.log(
              ' *** spell sending failed! please try again or connect to wifi *** ');
          return callback();
        });
      }
    }

    // adds a spell command
    function addSpell(spell, desc, log) {
      desc = desc || 'Equip ' + spell;
      log = log || '--> turning on ' + spell;
      let v = vorpal.command(spell, desc)
                  .action(function(args, callback) {
                    this.log(log);
                    return checkWifi(() => emit(spell), () => callback());
                  })
                  .alias('spell ' + spell);
      emit('learn', spell);
      return v;
    };

    vorpal.command('health', 'Show info about your health')
        .action(function(args, callback) {
          this.log('Health: ' + state.health);
          return callback();
        });


    let enemy_info = {
      cable_snake:
          'small speedy snake. easily scared off but finds confidence in packs',
      hand_phone:
          'big body-blocking hand. very strong, self reliant. doesn\'t back down in the face of adversary',
      disk_drive:
          'very angry, will spray you with diskettes and drives. no fear',
      possessed_peripherals:
          'annoying swarms. animated by the spirits of lost data and misplaced files',
      ambient_ghost: 'ambient. mysterious...'
    };


    vorpal
        .command(
            'enemy info',
            'Print info about all the enemies you\'ve seen so far')
        .action(function(args, callback) {
          if (state.discovered_enemies && state.discovered_enemies.length > 0) {
            for (let enemy of state.discovered_enemies) {
              this.log(enemy_info[discovered_enemies]);
            }
          } else {
            this.log('no enemies seen');
          }
          return callback();
        });

    let learntSpells = {};

    let learnSpell = {
      heal: () => addSpell('health heal', 'Heal 20 HP'),
      armour: () => addSpell('health armour', 'Get 20 armour'),
      fists:
          () => addSpell(
              'fists',
              'New workout improves hand strength by 100 with one simple trick'),
      water: () => addSpell('water', 'make things wet (voids warranty)'),
      fireball: () => addSpell(
                    'fireball', 'turn up the heat with this holiday favourite'),
      landmine: () => addSpell('landmine', 'open for a surprise'),
      firespray: () => addSpell('spray fire', 'warranty voided upon usage'),
      waterspray: () => addSpell(
                      'spray water', 'a fine mist appears at your fingertips'),
      jump: () => addSpell('jump', 'boing!'),
      crouch: () => addSpell('crouch', '!goinb'),
      armor: () => vorpal.command('health armour', 'Gain 20 armour points')
                       .action(function(args, callback) {
                         this.log('Health: ' + state.health);
                         return callback();
                       }),
      shield: () => vorpal.command('health shields', 'Gain 20 armour points')
                        .action(function(args, callback) {
                          this.log('Health: ' + state.health);
                          return callback();
                        })
    };

    learnSpell.fists();
    learnSpell.heal();
    // addSpell('lightning', 'blow them away with this powerful spell');

    addSpell(
        'radar', 'connect to your nearby friends',
        'radar has stopped due to an unexpected error');

    on('learnSpell', (spell) => {
      let alreadyKnown = false;
      if (learntSpells[spell] != undefined) {
        vorpal.log(
            'updating ' + spell + ' to latest version v' + Math.random() + '.' +
            Math.random());
        alreadyKnown = true;
      }
      if (spell in learnSpell) {
        vorpal.log('downloading ' + spell);
        loading_bar('downloading', 4000 + 2000 * Math.random(), () => {
          if (!alreadyKnown) learnSpell[spell]();
          learntSpells[spell] = true;
          vorpal.log(
              spell + ' spell downloaded!\n\ttype: help ' + spell +
              ' for usage instructions and help');

        })
      }
    })

    addSpell('attack', 'use the current spell').alias('atk').alias('a');

    vorpal
        .command(
            '__learnSpell <spell>',
            function(args, callback) {
              learnSpell[args.spell]();
              learntSpells[spell] = true;
            })
        .hidden();

    vorpal.command('spell', 'Equip the spell').action(function(args, callback) {
      this.log('i\'m sorry, i don\'t understand what you mean');
      return callback();
    });

    vorpal.catch('catch-all').action(function(args, callback) {
      this.log('i\'m sorry, i don\'t understand what you mean');
      return callback();
    });

    ipc.of.dash.on('ack', () => {});

    let flashlightOn = false;
    // informational commands that are always there
    vorpal.command('flashlight', 'Turns on flashlight')
        .action(function(args, callback) {
          this.log(
              '--> turning ' + flashlightOn ? 'on' :
                                              'off' +
                      ' flashlight');
          emit('flashlight');
          flashlightOn = true;
          callback();
        });

    vorpal.command('inventory', 'Opens app drawer')
        .action(function(args, callback) {
          this.log('^ opening inventory');
          state.inventory.opened = true;
          // emit('inventory');
          return callback();
        });

    vorpal.command('spells', ' Lists spells in my memory')
        .action(function(args, callback) {
          this.log(state.spells.join(' '));
          return callback();
        });

    addSpell('scan', 'QR-code scanner');

    vorpal.delimiter('cir > ').show();
  });
})
