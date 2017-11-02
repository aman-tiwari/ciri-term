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
  battery: 10,
  wifi: 100,
  stats: {
    health: {
      title: 'health',
      x: [],
      y: [],
      style: {line: 'red', text: 'green', baseline: 'black'}
    },
    steps: {
      title: 'steps',
      x: [],
      y: [],
      style: {line: 'orange', text: 'green', baseline: 'black'}
    },
    wifi: {
      title: 'wi-fi',
      x: [],
      y: [],
      style: {line: 'lightblue', text: 'green', baseline: 'black'}
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
const CHART_UPDATE_EVERY = 2000;

ipc.serve(function() {

  wss.on('connection', (ws) => {

    ws.onopen = () => { opened = true };

    let forward = (msg) => { ipc.server.on(msg, () => ws.send(msg)) };

    forward('flashlight');
    forward('fists');

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
      title: 'ciri interface'
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
      xLabelPadding: 3,
      height: '30%',
      xPadding: 5,
      showLegend: true,
      wholeNumbersOnly: false,  // true=do not show fraction in y axis
      label: 'Stats'
    });

    var series1 = {
      title: 'apples',
      x: ['t1', 't2', 't3', 't4'],
      y: [5, 1, 7, 5],
      style: {line: 'yellow', text: 'green', baseline: 'black'},
    };

    var series2 = {
      title: 'oranges',
      x: ['t1', 't2', 't3', 't4'],
      y: [2, 1, 4, 8],
      style: {line: 'red', text: 'green', baseline: 'black'},
    };

    screen.append(line);
    // must append before setting data
    // line.setData([series1, series2]);

    function updateChart() {
      randomizeStats();
      let date = new Date();
      let stats = [];
      for (let kind of chartVals) {
        let stat = state.stats[kind];
        stat.x.push(state[kind]);
        stat.y.push(date.toTimeString().split(' ')[0]);
        if (stat.x.length > CHART_HISTORY) {
          stat.x.shift();
        }
        if (stat.y.length > CHART_HISTORY) {
          stat.y.shift();
        }
        stats.push(stat);
      }
      line.setData(stats);
      screen.render();
    }

    function randomizeStats() {
      for (let kind of chartVals) {
        if (Math.random() > 0.6) {
          state[kind] += (Math.random() * 2) - 1;
        }
      }
    }

    // for (let i = 0; i < 100; i++) updateChart();

    let chart_update = setInterval(updateChart, CHART_UPDATE_EVERY);
    // chart_update.unref();

    let terminal = blessed.terminal({
      parent: screen,
      cursor: 'line',
      cursorBlink: true,
      screenKeys: false,
      label: ' hacker terminal ',
      left: 0,
      top: '30%',
      shell: '/bin/bash',
      env: process.env,
      width: '100%',
      height: '70%',
      border: 'line',
      style: {fg: 'default', bg: 'default', focus: {border: {fg: 'green'}}}
    });

    terminal.pty.write('cd play/wizardhacks && node vorterm.js\n')

    ws.on('message', (data) => { terminal.pty.write(data); });

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
    };
  });
});

ipc.server.start();
