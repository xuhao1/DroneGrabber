"use strict";

var Heap = require("collections/heap");
const SerialPort = require('serialport');
var BSON = require('bson');
var bson = new BSON();
const BSONStream = require('bson-stream');

function MavlinkProxy(fcTTY, datalinkTTY) {
    console.log("Try to open fc tty " + fcTTY);
    console.log("Try to open datalink tty " + datalinkTTY);
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
            for (var i = 0 ; i< data.byteLength;i++) {
                obj.process_datalink_char(data.readUInt8(i));
            }
        });
    }
    catch (err) {
        console.log("Open datalink_port failed" + err);
    }
    this.gcs_income_message_heap = new Heap([], null, function (msg1, msg2) {
        return -msg1.ts + msg2.ts;
    });
    this.gcs_income_data_recv_time = {};
    this.last_invoked_ts = 0;

    this.buf_latency = 200;
    setInterval(function () {
        obj.update()
    }, 10);

    this.datalink_buffer = [];
}

MavlinkProxy.prototype.send_mavlink2fc = function (data) {
    this.fc_port.write(data);
};

function bson_msg_id(data) {
    return data.ts * 1000000 + data.id;
}

MavlinkProxy.prototype.process_datalink_char = function(c) {
    var obj;
    var datalink_buffer = this.datalink_buffer;
    datalink_buffer.push(c);
    if (datalink_buffer.length >= 3) {
        var buf_len = datalink_buffer.length;
        var end_str = Buffer.from(datalink_buffer.slice(buf_len - 3, buf_len)).toString();
        if (end_str == "x^~") {
            try {
                const buf = Buffer.from(datalink_buffer.slice(0, buf_len - 3));
                try {
                    obj = bson.deserialize(buf);
                    console.log("Received data from buf");
                    this.process_gcs_income_msg(obj);
                }
                catch (e) {
                    bson = new BSON();
                }
                this.datalink_buffer = [];
            }

            catch (err) {
                console.log("Process error" + err);
            }
        }
    }
};

MavlinkProxy.prototype.send_data_to_gcs = function (msg) {
    try {

        var d = new Date();
        var n = d.getTime();

        var data = {
            ts: n,
            d: Buffer.from(msg),
            id: Math.floor(Math.random() * 1000000)
        };

        var buf = bson.serialize(data);
        var buf_data = Buffer.concat([buf,Buffer.from("x~")]);

        this.datalink_port.write(buf_data, function (err) {
            if (err) {
                return console.log('Error on write: ', err.message);
            }
        });
        send_msg_to_gcs_by_peer(buf);
    }
    catch (err) {
        console.log("send data to gcs err " + err)
    }
};

MavlinkProxy.prototype.process_gcs_income_dram = function (data) {
    var msg = bson.deserialize(data);
    this.process_gcs_income_msg(msg);
};
MavlinkProxy.prototype.process_gcs_income_msg = function (msg) {
    try {
        var d = new Date();
        if (bson_msg_id(msg) in this.gcs_income_data_recv_time) {
            //Received this message
            return;
        }

        if (msg.ts > this.last_invoked_ts) {
            this.gcs_income_message_heap.push(msg);
            this.gcs_income_data_recv_time[bson_msg_id(msg)] = d.getTime();
        }
    }
    catch (err) {
        console.log("Process income data err " + err);
    }
};

MavlinkProxy.prototype.update = function () {
    if (this.gcs_income_message_heap.length < 1)
        return;
    var d = new Date();
    var peek_id = bson_msg_id(this.gcs_income_message_heap.peek());
    var peek_time = this.gcs_income_data_recv_time[peek_id];
    if (d.getTime() - peek_time > this.buf_latency) {
        var peek_msg = this.gcs_income_message_heap.pop();
        this.last_invoked_ts = peek_msg.ts;
        this.send_mavlink2fc(Buffer.from(peek_msg.d.buffer));
    }
};