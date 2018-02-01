"use strict";

var Heap = require("collections/heap");
const SerialPort = require('serialport');
var BSON = require('bson');
var bson = new BSON();

function MavlinkProxy(fcTTY, datalinkTTY) {
    console.log("Try to open fc tty "+fcTTY);
    console.log("Try to open datalink tty "+datalinkTTY);
    this.fc_port = new SerialPort(fcTTY, {autoOpen: false, baudRate: 57600});
    this.datalink_port = new SerialPort(datalinkTTY, {autoOpen: false, baudRate: 57600});
    const obj = this;
    try {
        console.log("Try to open" + fcTTY);
        this.fc_port.open(function (err) {
            if (err) {
                return console.log('Error opening drone_port: ', err.message);
            }

        });

        this.fc_port.on('open', function () {
            console.log('open fc_port success')
        });

        this.fc_port.on('data', function (data) {
            // console.log(data);
            obj.send_data_to_gcs(data);
        });
    }
    catch (err) {
        console.log("Open fc_port failed" + err);
    }

    try {
        console.log("Try to open " + datalinkTTY);
        this.datalink_port.open(function (err) {
            if (err) {
                return console.log('Error opening drone_port: ', err.message);
            }

        });

        this.datalink_port.on('open', function () {
            console.log('open datalink_port success')
        });

        this.datalink_port.on('data', function (data) {
            obj.process_gcs_income_data(data);
        });
    }
    catch (err) {
        console.log("Open datalink_port failed" + err);
    }
    this.gcs_income_message_heap = new Heap([], null, function (msg1, msg2) {
        return - msg1.ts + msg2.ts;
    });
    this.gcs_income_data_recv_time = {};
    this.last_invoked_ts = 0;

    this.buf_latency = 200;

    setInterval(function()
    {
        obj.update()
    },10);
}

MavlinkProxy.prototype.send_mavlink2fc = function (data) {
    this.fc_port.write(data);
};

function bson_msg_id(data) {
    return data.ts * 1000000 + data.id;
}

MavlinkProxy.prototype.send_data_to_gcs = function (data) {
    this.datalink_port.write(data);
    send_msg_to_gcs_by_peer(data);
};

MavlinkProxy.prototype.process_gcs_income_data = function (payload) {
    // console.log("Process incoming data");
    var msg = bson.deserialize(payload);
    var d = new Date();
    // console.log(msg.ts+" : "+ msg.id);
    if (bson_msg_id(msg) in this.gcs_income_data_recv_time) {
        //Received this message
        return;
    }
    // console.log("Not Recved last ts"+this.last_invoked_ts);

    if (msg.ts > this.last_invoked_ts) {
        // console.log("push data "+bson_msg_id(msg)+" to heap");
        this.gcs_income_message_heap.push(msg);
        this.gcs_income_data_recv_time[bson_msg_id(msg)] = d.getTime();
    }
};

MavlinkProxy.prototype.update = function () {
    if (this.gcs_income_message_heap.length < 1)
        return;
    var d = new Date();
    var peek_id = bson_msg_id(this.gcs_income_message_heap.peek());
    var peek_time = this.gcs_income_data_recv_time[peek_id];
    // console.log("Peek id "+ peek_id + " time "+peek_time);
    if (d.getTime() - peek_time > this.buf_latency) {
        var peek_msg = this.gcs_income_message_heap.pop();
        this.last_invoked_ts = peek_msg.ts;
        // console.log("Send data " + peek_id + "to fc");
        this.send_mavlink2fc(Buffer.from(peek_msg.d.buffer));
    }
};