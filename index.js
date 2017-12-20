'use strict'

let WebSocketServer = require('ws').Server;
let blessed = require('blessed');
let contrib = require('blessed-contrib');
let ipc = require('node-ipc');

ipc.config.logger = () => {};
ipc.config.id = 'dash';
ipc.config.retry = 500;
ipc.config.sync = true;
ipc.config.silent = true;

let wss = new WebSocketServer({port: 10101});

console.log('waiting for connection...');
let opened = null;

const state = {
  spells: [],
  flashlight: false,
  inventory: {opened: false, items: []},
  health: 100,
  steps: 50,
  battery: 100,
  wifi: 100,
  discovered_enemies: [],
  stats: {
    health: {
      title: 'health',
      x: [],
      y: [],
      style: {line: 'red', text: 'red', baseline: 'black'}
    },
    velocity: {
      title: 'steps',
      x: [],
      y: [],
      style: {line: 'orange', text: 'orange', baseline: 'black'}
    },
    wifi: {
      title: 'wi-fi',
      x: [],
      y: [],
      style: {line: 'blue', text: 'blue', baseline: 'black'}
    },
    battery: {
      title: 'battery',
      x: [],
      y: [],
      style: {line: 'green', text: 'green', baseline: 'black'}
    }
  }
};

let chartVals = ['health'];


// how many values to show in the stats charts
const CHART_HISTORY = 10;

// update the chart every
const CHART_UPDATE_EVERY = 500;

const DATA_SENDING_FAIL_PROBABILITY = 0.4;
const SPELL_WAIT = 3 * 1000;


wss.on('connection', (ws) => {

  ipc.serve(function() {
    ws.onopen = () => { opened = true };
    let terminal;
    let forward = (msg) => {
      ipc.server.on(msg, (data, sock) => {
        // if (state.wifi >= 10 * Math.random()) {
        ws.send(msg);
        ipc.server.emit(sock, 'ack');
        //    ipc.server.emit(sock, 'wifi');
        //  } else {
        //   if (terminal != undefined) {
        //    ipc.server.emit(sock, 'no wifi', msg);
        //   if (Math.random() > DATA_SENDING_FAIL_PROBABILITY) {
        //    setTimeout(() => ws.send(msg), SPELL_WAIT);
        //   ipc.server.emit(sock, 'ack');
        //} else {
        // ipc.server.emit(sock, 'sending failed');
        // }
        //  }
        //}
      });
    };

    forward('flashlight');
    forward('fists');

    ipc.server.on('learn', function(data, sock) {
      forward(data);
      ipc.server.emit(sock, 'ack');
    })

    ipc.server.on('camera', (kind, socket) => {
      if (kind.data == 'front') {
        ws.send('photo:frontCamera');
      } else {
        ws.send('photo:rearCamera');
      }
    });

    ipc.server.on('download', function({kind, data}) {
      switch (kind) {
        case 'meme':
          break;
        case 'spell':
          // TODO: download spell
          break;
      }
    });

    let screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      dockBorders: true,
      ignoreDockContrast: true,
      title: 'cir interface'
    });

    /* let line = contrib.line({
      width: '100%',
      height: '30%',
      left: 0,
      top: 0,
      label: 'Stats',
      legend: {width: 12}
    }); */

    // screen.append(line);

    var line = contrib.line({
      xLabelPadding: 1,
      height: '30%',
      xPadding: 2,
      showLegend: true,
      border: 'line',
      wholeNumbersOnly: false,  // true=do not show fraction in y axis
      label: 'Stats',
      screen: screen
    });

    var bar_h = contrib.bar({
      label: 'Health (%)',
      width: '10%',
      height: '70%',
      border: 'line',
      left: '70%',
      top: '30%',
      barWidth: 4,
      barSpacing: 6,
      xOffset: 0,
      maxHeight: 80,
      barBgColor: 'red',
      screen: screen
      
    });


    var bar_w = contrib.bar({
      label: 'Health (%)',
      width: '10%',
      height: '70%',
      border: 'line',
      left: '80%',
      top: '30%',
      barWidth: 4,
      barSpacing: 6,
      xOffset: 0,
      maxHeight: 80,
      barBgColor: 'blue',
      screen: screen
      
    });


    var bar_b = contrib.bar({
      label: 'Battery (%)',
      width: '10%',
      height: '70%',
      border: 'line',
      left: '90%',
      top: '30%',
      barWidth: 4,
      barSpacing: 6,
      xOffset: 0,
      maxHeight: 80,
      barBgColor: 'green',
      screen: screen
      
    });


    screen.append(line);
    screen.append(bar_h);
    screen.append(bar_w);
    screen.append(bar_b);

    // must append before setting data
    line.setData([state.stats.health, state.stats.wifi, state.stats.battery]);
    bar_h.setData({titles: ['health'], data: [state.health]});
    bar_w.setData({titles: ['wifi'], data: [state.wifi]});
    bar_b.setData({titles: ['battery'], data: [state.battery]});
    /*
    for (let i = 0; i < 400; i++) {
      let t = new Date().toTimeString().split(' ')[0];
      state.stats.health.y.push(state.health);
      state.stats.health.x.push(t);
      state.stats.wifi.y.push(state.wifi);
      state.stats.wifi.x.push(t);
      state.stats.battery.y.push(state.battery);
      state.stats.battery.x.push(t);
      if (state.stats.health.y.length > 400) {
        state.stats.health.y.shift();
        state.stats.health.x.shift();
        state.stats.wifi.y.shift();
        state.stats.wifi.x.shift();
        state.stats.battery.y.shift();
        state.stats.battery.x.shift();
      }
      line.setData([state.stats.health, state.stats.wifi, state.stats.battery]);
      bar_h.setData({titles: ['health'], data: [state.health]});
      bar_w.setData({titles: ['wifi'], data: [state.wifi]});
      bar_b.setData({titles: ['battery'], data: [state.battery]});
    }
*/
    function updateChart() {
      let t = new Date().toTimeString().split(' ')[0];
      state.stats.health.y.push(state.health);
      state.stats.health.x.push(t);
      state.stats.wifi.y.push(state.wifi);
      state.stats.wifi.x.push(t);
      state.stats.battery.y.push(state.battery);
      state.stats.battery.x.push(t);
      if (state.stats.health.y.length > 400) {
        state.stats.health.y.shift();
        state.stats.health.x.shift();
        state.stats.wifi.y.shift();
        state.stats.wifi.x.shift();
        state.stats.battery.y.shift();
        state.stats.battery.x.shift();
      }
      line.setData([state.stats.health, state.stats.wifi, state.stats.battery]);
      bar_h.setData({titles: ['health'], data: [state.health]});
      bar_w.setData({titles: ['wifi'], data: [state.wifi]});
      bar_b.setData({titles: ['battery'], data: [state.battery]});
      ipc.server.broadcast('sync', JSON.stringify(state));
      return;
    }

    function randomizeStats() {
      for (let kind of chartVals) {
        if (Math.random() > 0.6) {
          state[kind] += (Math.random() * 2) - 1;
        }
      }
    }

    // for (let i = 0; i < 100; i++) updateChart();

    let chart_update = setInterval(updateChart, 300);
    // chart_update.unref();

    function make_terminal() {
      let term = blessed.terminal({
        parent: screen,
        cursor: 'line',
        cursorBlink: true,
        screenKeys: false,
        label: ' hacker terminal ',
        left: 0,
        top: '30%',
        shell: '/bin/bash',
        env: process.env,
        width: '70%',
        height: '70%',
        border: 'line',
        style: {fg: 'default', bg: 'default', focus: {border: {fg: 'green'}}},
        screen: screen
      });

      return term;
    }

    function battery_dead() {
      return blessed.box({
        top: 'center',
        left: 'center',
        width: '50%',
        height: '50%',
        content:
            '{red-fg}  {bold}BATTERY DEAD PLEASE CHARGE ME{/bold} {/red-fg}',
        border: {type: 'line'},
        style: {fg: 'white', bg: 'red', border: {fg: 'red'}}
      })
    }

    terminal = make_terminal();

    terminal.pty.write('cd ' + __dirname + ' && ' + __dirname + '/node vorterm.js\n');


    let batteryNotice = battery_dead();
    let terminalClosed = false;

    ws.on('message', (data) => {
      // typing
      if (data.length == 1) terminal.pty.write(data);
      let [prefix, amt] = data.split(':');
      // console.log(prefix, amt);

      if (prefix in state && amt !== undefined) {
        prefix = prefix.trim();
        state[prefix] = parseFloat(amt);
      } else if (prefix == 'learnSpell') {
        ipc.server.broadcast('learnSpell', amt)
      }
    });

    ws.on('close', (code, reason) => {
      terminal.write(
          'closed with code: ' + code.toString() + ' and reason: ' + reason);
    });


    screen.render();

    screen.key('C-c', function() {
      ws.close(1000, 'ctrl-c recived');
      terminal.kill();
      // clearInterval(chart_update);
      return screen.destroy();
    });

    ws.onclose = () => {
      opened = false;
      terminal.kill();
      screen.destroy();
      ipc.server.stop();
    };
  });
  ipc.server.start();
});
