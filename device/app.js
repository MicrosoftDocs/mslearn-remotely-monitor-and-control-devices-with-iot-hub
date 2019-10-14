// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';
const chalk = require('chalk');
console.log(chalk.yellow('WineCellar device app'));

// The device connection string to authenticate the device with your IoT hub.
var connectionString = 'HostName=PetersIOTHub.azure-devices.net;DeviceId=PetersDevice;SharedAccessKey=O9MRAgElFD2bLU9t4+5fcPGR/zqtAinwOtKdPhVTXQg=';
// var connectionString = '<your device connection string>';

// The sample connects to a device-specific MQTT endpoint on your IoT Hub.
var Mqtt = require('azure-iot-device-mqtt').Mqtt;
var DeviceClient = require('azure-iot-device').Client
var Message = require('azure-iot-device').Message;

var client = DeviceClient.fromConnectionString(connectionString, Mqtt);
var deviceTwin;

// Wine cellar globals.
const roomTemperature = 23;                             // Room temperatures vary, but typically are 20 to 25 degrees C.
var desiredTemperature = 12.77777;                      // Desired temperature for stored wine, in degrees C.
var desiredTempLimit = 5.5;                             // Acceptable range above or below the desired temp, in degrees C.
var desiredHumidity = 65;                               // Humidity in relative percentage of air saturation.
var desiredHumidityLimit = 15;                          // Acceptable range above or below the desired humidity, in percentages.
var intervalInMilliseconds = 5000;                      // Interval at which telemetry is sent to the cloud.

// Enum for the state of the fan (for cooling and heating), and humidifing.
var stateEnum = Object.freeze({ "off": "off", "on": "on", "failed": "failed" });
var fanState = stateEnum.off;

var currentTemperature = desiredTemperature;            // Initial setting of temperature.
var currentHumidity = desiredHumidity;                  // Initial setting of humidity.

function greenMessage(text) {
    console.log(chalk.green(text));
}

function redMessage(text) {
    console.log(chalk.red(text));
}

// Function to handle the SetFanState direct method call from IoT hub
function onSetFanState(request, response) {

    // Function to send a direct method reponse to your IoT hub.
    function directMethodResponse(err) {
        if (err) {
            redMessage('An error ocurred when sending a method response:\n' + err.toString());
        } else {
            greenMessage('Response to method \'' + request.methodName + '\' sent successfully.');
        }
    }

    greenMessage('Direct method payload received:' + request.payload);

    // Check that a valid value was passed as a parameter.
    if (fanState == stateEnum.failed) {
        redMessage('Fan has failed and cannot have its state changed');

        // Report failure back to your hub.
        response.send(400, 'Fan has failed and cannot be set to: ' + request.payload, directMethodResponse);
    } else {
        if (request.payload != "on" && request.payload != "off") {
            redMessage('Invalid state response received in payload');

            // Report failure back to your hub.
            response.send(400, 'Invalid direct method parameter: ' + request.payload, directMethodResponse);

        } else {
            fanState = request.payload;

            // Report success back to your hub.
            response.send(200, 'Fan state set: ' + request.payload, directMethodResponse);

            // Confirm changes to reported properties.
            sendReportedProperties();
        }
    }
}

// Send telemetry messages to your hub.
function sendMessage() {

    // Simulate telemetry.
    var deltaTemperature = Math.sign(desiredTemperature - currentTemperature);
    var deltaHumidity = Math.sign(desiredHumidity - currentHumidity);

    if (fanState == stateEnum.on) {

        // If the fan is on the temperature and humidity will be nudged towards the desired values most of the time.
        currentTemperature += (deltaTemperature * Math.random()) + Math.random() - 0.5;
        currentHumidity += (deltaHumidity * Math.random()) + Math.random() - 0.5;

        // Randomly fail the fan. 
        if (Math.random() < 0.01) {
            fanState = stateEnum.failed;
            redMessage('Fan has failed');
        }
    }
    else {
        // If the fan is off, or has failed, the temperature will creep up until it reaches room temperature.
        // The humidity will change randomly.
        currentTemperature = Math.min(currentTemperature + Math.random() / 10, roomTemperature);
        currentHumidity += Math.random() - 0.5;
    }

    // Prepare the telemtry message.
    var message = new Message(JSON.stringify({
        temperature: currentTemperature.toFixed(2),
        humidity: currentHumidity.toFixed(2),
    }));

    // Add custom application properties to the message.
    // An IoT hub can filter on these properties without access to the message body.
    message.properties.add('sensorID', "S1");
    message.properties.add('fanAlert', (fanState == stateEnum.failed) ? 'true' : 'false');

    // Send temperature or humidity alerts, only if they occur.
    if ((currentTemperature > desiredTemperature + desiredTempLimit) || (currentTemperature < desiredTemperature - desiredTempLimit)) {
        message.properties.add('temperatureAlert', 'true');
    }
    if ((currentHumidity > desiredHumidity + desiredHumidityLimit) || (currentHumidity < desiredHumidity - desiredHumidityLimit)) {
        message.properties.add('humidityAlert', 'true');
    }

    console.log('\nMessage data: ' + message.getData());

    // Send the telemetry message.
    client.sendEvent(message, function (err) {
        if (err) {
            redMessage('Send error: ' + err.toString());
        } else {
            greenMessage('Message sent');
        }
    });
}

// Create a patch to send to the hub.
var reportedPropertiesPatch = {
    firmwareVersion: '1.2.3',
    lastPatchReceivedId: '',
    fanState: '',
    currentTemperature: '',
    currentHumidity: ''
};

// Send the reported properties patch to the hub.
function sendReportedProperties() {

    // Prepare the patch.
    reportedPropertiesPatch.fanState = fanState;
    reportedPropertiesPatch.currentTemperature = currentTemperature.toFixed(2);
    reportedPropertiesPatch.currentHumidity = currentHumidity.toFixed(2);

    deviceTwin.properties.reported.update(reportedPropertiesPatch, function (err) {
        if (err) {
            redMessage(err.message);
        } else {
            greenMessage('\nTwin state reported');
            greenMessage(JSON.stringify(reportedPropertiesPatch, null, 2));
        }
    });
}

// Handle changes to the device twin properties.
client.getTwin(function (err, twin) {
    if (err) {
        redMessage('could not get twin');
    } else {
        deviceTwin = twin;
        deviceTwin.on('properties.desired', function (v) {
            desiredTemperature = parseFloat(v.temperature);
            desiredHumidity = parseFloat(v.humidity);
            greenMessage('Setting desired temperature to ' + v.temperature);
            greenMessage('Setting desired humidity to ' + v.humidity);

            // Update the reported properties, after processing the desired properties.         
            sendReportedProperties();
        });
    };
});

// Set up the handler for the SetFanState direct method call.
client.onDeviceMethod('SetFanState', onSetFanState);

// Set up the telemetry interval.
setInterval(sendMessage, intervalInMilliseconds);
