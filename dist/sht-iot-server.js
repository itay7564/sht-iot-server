'use strict';

const fs = require('fs');
const EventEmitter = require('events');
const crypto = require('crypto'); //used only for MD5 encoding
const io = require('socket.io');
const http = require('http');

const settings = JSON.parse(fs.readFileSync('serverSettings.json'));
const userPort = settings.userPort;
const devicePort = settings.devicePort;
const deviceUpdatePort = settings.deviceUpdatePort;
const domainName = settings.domainName;
const updatesPath = 'updates';
const eventEmitter = new EventEmitter();

let devices = [];

//---------------------User Server--------------------------//
//Webpage is served staticaly by nginx, use socket.io only

const userIO = io(userPort);
console.log("User socket.io server listening at port", userPort);
userIO.on('connection', (client) => {
    client.emit('devicesUpdate', devices); //send devices for the first time
    eventEmitter.on('deviceChange', () => {
        client.emit('devicesUpdate', devices); //every time a device has changed, send the devices object
    });
    client.on('deviceAction', (deviceID, actionName, data) => {
        if (deviceID === undefined || actionName === undefined || data === undefined) {
            console.log('Undefined objects received from user');
            return;
        }
        let deviceIndex = findDevice(deviceID);
        if (deviceIndex === -1) {
            console.log('Invalid deviceID received from user');
            return; //device not found, invalid ID
        }
        console.log('deviceAction', deviceID, actionName, data);
        if (actionName == 'addTimer') {
            if (verifyTimer(deviceIndex, data)) {
                let timer = {
                    startHour: data.startHour, startMinute: data.startMinute,
                    endHour: data.endHour, endMinute: data.endMinute,
                    temporary: data.temporary
                };
                eventEmitter.emit('addTimer', deviceID, timer);
            }
            else {
                console.log('Invalid timer received from user');
            }
        }
        else if (actionName == 'removeTimer') {
            if (verifyRemoveTimer(deviceIndex, data)) {
                let id = data.id;
                eventEmitter.emit('removeTimer', deviceID, id);
            }
        }
        else if (actionName == 'buttonPress') {
            if (verifyButtonPress(deviceIndex, data)) {
                let id = data.id;
                eventEmitter.emit('buttonPress', deviceID, id);
            }
        }

    });
});

////---------------------User Server END--------------------------//

//-----------------------Device Server----------------------------//
const deviceIO = io(devicePort);
console.log("Device socket.io server listening at port", devicePort);
deviceIO.on('connection', (client) => {
    console.log('client connected', client.conn.remoteAddress);
    let device = { buttons: [], timers: [] }; //initialize arrays to avoid "undefined" errors
    let receivedInfo = false;
    let index = -1;
    client.emit('test', { test1: "hello", arr: [{ el1: "1" }, { el2: "2" }] }, 'test2'); //test
    client.on('deviceInfo', (info) => {
        device.name = info.name;
        device.allowTimers = info.allowTimers;
        if (info.id == "") {
            console.log('sending new hash');
            let hash = crypto.randomBytes(12).toString("base64"); //generates a randmom base64 string with a length of 16 chararcters
            client.emit('setID', hash);
            device.id = hash;
            index = devices.push(device) - 1;
        }
        else {
            let exists = false;
            devices.forEach((existingDevice, index) => {
                if (existingDevice.id == info.id) {
                    exists = true;
                    device.id = info.id;
                    devices[index] = device;
                }
            });
            if (!exists) {
                device.id = info.id;
                index = devices.push(device) - 1;
            }

        }
        receivedInfo = true;
        console.log(info);
    });
    client.on('stateUpdate', (newState) => {
        device.state = newState.state;
        device.stateColor = newState.stateColor;
        updateDevice();
        console.log(newState);
    });
    client.on('buttonUpdate', (buttons) => {
        device.buttons = buttons;
        updateDevice();
        console.log(buttons);
    });

    client.on('timerUpdate', (timers) => {
        device.timers = timers;
        updateDevice();
        console.log(timers);
    });

    eventEmitter.on('addTimer', (deviceID, timer) => {
        if (deviceID === device.id) {
            client.emit('addTimer', timer);
        }
    });
    eventEmitter.on('removeTimer', (deviceID, timerID) => {
        if (deviceID === device.id) {
            client.emit('removeTimer', timerID);
        }
    });
    eventEmitter.on('buttonPress', (deviceID, buttonID) => {
        if (deviceID === device.id) {
            client.emit('buttonPress', buttonID);
        }
    });

    function updateDevice() {
        if (receivedInfo) {
            devices[index] = device;
            eventEmitter.emit('deviceChange');
        }
        else {
            console.log('device change without info');
        }
    }
});

//---------------------Device Server END--------------------------//

//---------------------Device OTA update Server-------------------//
//The logic of this server is defined in this doc: https://arduino-esp8266.readthedocs.io/en/stable/ota_updates/readme.html#http-server
const deviceUpdateServer = http.createServer( (req, res) => {
    //console.log(JSON.stringify(req));
    //Check headers:
    if (
        !req.headers["x-esp8266-sta-mac"] || !req.headers["x-esp8266-ap-mac"] || !req.headers["x-esp8266-free-space"]
        || !req.headers["x-esp8266-sketch-size"] || !req.headers["x-esp8266-sketch-md5"] || !req.headers["x-esp8266-chip-size"]
        || !req.headers["x-esp8266-sdk-version"] || req.headers["user-agent"] != "ESP8266-http-Update"
    ) {
        console.log("Update invalid headers")
        res.writeHead(403);
        res.end();
    }
    else if (/\/\w+\.bin/.test(req.url) || fs.existsSync(updatesPath + req.url)) { //Check that the url is only /[valid file name].bin 
        let updateData;
        try {
            updateData = fs.readFileSync('updates' + req.url);
        }
        catch (err) {
            console.log("Update file error:", err);
            console.log("Request URL:", req.url);
            res.writeHead(404);
            res.end();
        }
        let newMD5 = crypto.createHash('md5').update(updateData).digest("hex"); //get MD5 hash of compiled sketch
        if (newMD5 != req.headers["x-esp8266-sketch-md5"]) {//Make sure new binary is not the same as old one
            console.log("Updating...");
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', 'attachment; filename="' + req.url + '"');
            res.setHeader('Content-Length', updateData.byteLength);
            res.setHeader('x-MD5', newMD5);
            res.writeHead(200);
            res.end(updateData, "utf-8"); //send update file binary
        }
        else {
            console.log("MD5 not changed. not updating");
            res.writeHead(304); //304 Not modified; There is no new update.
            res.end();
        }
    }
    else {
        console.log("update bad URL:", req.url)
        res.writeHead(404);
        res.end();
    }
});
deviceUpdateServer.listen(deviceUpdatePort, function () {
    console.log("Device update server listening at port", deviceUpdatePort);
});
//---------------------Device OTA update Server END-------------------//


function verifyTimer(deviceIndex, timer) {
    if (timer.startHour === undefined || timer.startMinute === undefined 
        || timer.endHour === undefined || timer.endMinute === undefined || timer.temporary === undefined) {
        return false;
    }
    if (!isHour(timer.startHour) || !isHour(timer.endHour)
        || !isMinute(timer.startMinute) || !isMinute(timer.endMinute) || typeof (timer.temporary) !== "boolean") {
        return false;
    }
    let existingTimers = devices[deviceIndex].timers;
    //check if this timer overlaps with other timers
    let startTime = timer.startHour * 60 + timer.startMinute;
    let endTime = timer.endHour * 60 + timer.endMinute;
    if (startTime >= endTime) {
        return false; //start can't be after end
    }
    for (let i = 0; i < existingTimers.length; i++) {
        let existingTimer = existingTimers[i];
        let existingStart = existingTimer.startHour * 60 + existingTimer.startMinute;
        let existingEnd = existingTimer.endHour * 60 + existingTimer.endMinute;
        if (numberInRange(existingStart, startTime, existingEnd)
            || numberInRange(existingStart, endTime, existingEnd)
            || numberInRange(startTime, existingStart, endTime)
            || numberInRange(startTime, existingEnd, endTime)) {
            return false; //the timer overlaps with other timers
        }
    }
    return true;
}

function isHour(hour) {
    return (Number.isInteger(hour) && hour >= 0 && hour < 24)
}
function isMinute(minute) {
    return (Number.isInteger(minute) && minute >= 0 && minute < 60)
}
function numberInRange(start, num, end) {
    return num >= start && num <= end;
}

function verifyRemoveTimer(deviceIndex, data) {
    if (data.id === undefined || !Number.isInteger(data.id))
        return false;
    if (data.id < 0 || data.id >= devices[deviceIndex].timers.length)
        return false;

    return true;
}

function verifyButtonPress(deviceIndex, data) {
    if (data.id === undefined || !Number.isInteger(data.id))
        return false;
    if (data.id < 0 || data.id >= devices[deviceIndex].buttons.length)
        return false;

    return true;
}

//searches for a device by id and returns its index in the devices array. returns -1 if not found
function findDevice(id) {
    for (let i = 0; i < devices.length; i++) {
        if (devices[i].id == id) {
            return i;
        }
    }
    return -1; //device not found
}

//Mockup json device array
/*
let devices =
    [
        {
            id: 0, name: "Boiler", state: "On", stateColor: "green", allowTimers: true,
            timers: [{ id: 0, startHour: 12, startMinute: 0, endHour: 13, endMinute: 0, temporary: true },
            { id: 1, startHour: 3, startMinute: 0, endHour: 6, endMinute: 0, temporary: false },
            { id: 2, startHour: 0, startMinute: 0, endHour: 2, endMinute: 0, temporary: false }
            ], buttons: []
        },
        {
            id: 1, name: "Air Conditioner", state: "Off", stateColor: "red", allowTimers: false,
            buttons: [
                { id: 0, name: "Start Cooling", color: "blue" },
                { id: 1, name: "Start Heating", color: "orange" },
                { id: 2, name: "Turn Off", color: "red" }
            ],
        },

        {

            id: 2, name: "Shutter", state: "Down", stateColor: "red", allowTimers: false,

            buttons: [
                { id: 0, name: "Open", color: "green" },
                { id: 1, name: "Close", color: "red" },
                { id: 2, name: "Stop", color: "blue" }
            ]
        }
    ]

*/