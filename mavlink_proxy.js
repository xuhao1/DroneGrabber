"use strict";

const dgram = require('dgram');
const server = dgram.createSocket('udp4');
var drone_rinfo = 0;
const SerialPort = require('serialport');
const port = new SerialPort('/dev/ttyS0', {autoOpen: false, baudRate: 921600});

const using_serial = true;

if (using_serial) {
    try{

    port.open(function (err) {
        if (err) {
            return console.log('Error opening port: ', err.message);
        }

    });

    port.on('open', function () {
        console.log('open port success')
    });

    port.on('data', function (data) {
        // console.log('Data:', data);
        send_msg_to_gcs(data);
    });
    }
    catch(err) {
        console.log("Open port failed"+err);
    }

}
else {


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
    server.bind(41234);
}

function send_mavlink2drone(data) {
    if (using_serial) {
        port.write(data);
    }
    else if (drone_rinfo != 0)
        server.send(data, drone_rinfo.port, drone_rinfo.address);
}





