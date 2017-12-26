"use strict";

const dgram = require('dgram');
const server = dgram.createSocket('udp4');
var drone_rinfo = 0;

server.on('error', function (err) {
    console.log("server error", err.stack);
    server.close();
});

server.on('message', function (msg, rinfo) {
    // console.log("server got: msg",msg);
    drone_rinfo = rinfo;
    send_msg_to_gcs(msg);
});

server.on('listening', function () {
    const address = server.address();
    console.log("server listening ", address.address, address.port);
});

function send_mavlink2drone(data) {
    if (drone_rinfo != 0)
        server.send(data,drone_rinfo.port, drone_rinfo.address);
}

server.bind(41234);