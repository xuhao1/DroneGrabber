var os = require('os');
var pty = require('node-pty');

var terminals = {},
    logs = {};
var term = 0;

function start_terminal(query_cols, query_rows) {
    var cols = parseInt(query_cols),
        rows = parseInt(query_rows);
    term = pty.spawn('bash', [], {
        name: 'xterm-color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: "/",
        env: process.env
    });

    console.log('Created terminal with PID: ' + term.pid);
    terminals[term.pid] = term;
    logs[term.pid] = '';
    send_term_data("Hello,World\n");
    term.on('data', function (data) {
        try {
            // ws.send(data);
            send_term_data(data);
        } catch (ex) {
        }
    });
};

// app.post('/terminals/:pid/size', function (req, res) {
//     var pid = parseInt(req.params.pid),
//         cols = parseInt(req.query.cols),
//         rows = parseInt(req.query.rows),
//         term = terminals[pid];
//
//     term.resize(cols, rows);
//     console.log('Resized terminal ' + pid + ' to ' + cols + ' cols and ' + rows + ' rows.');
//     res.end();
// });

function on_xterm_data(data) {
    if (term != 0)
        term.write(data);
}

// app.ws('/terminals/:pid', function (ws, req) {
//     console.log('Connected to terminal ' + term.pid);
//     ws.send(logs[term.pid]);
//
//     ws.on('message', function(msg) {
//         term.write(msg);
//     });
//     ws.on('close', function () {
//         term.kill();
//         console.log('Closed terminal ' + term.pid);
//         Clean things up
// delete terminals[term.pid];
// delete logs[term.pid];
// });
// });
//

