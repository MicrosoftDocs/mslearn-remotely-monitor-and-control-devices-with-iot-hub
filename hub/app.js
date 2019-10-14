// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const chalk = require('chalk');
console.log(chalk.yellow('WineCellar Operator: the back-end service app'));

// The connection string for the IoT Hub service.
var connectionString = 'HostName=PetersIOTHub.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=1fRjAms3Y/U4YUs2HvTLSUyeKxGd0hpSe1Cat8792UQ=';
var deviceId = 'PetersDevice';
//var connectionString = '<your iothubowner connection string>';
//var deviceId = '<your device ID>';


// The sample connects to service-side endpoint to call direct methods on devices.
var Client = require('azure-iothub').Client;
var Registry = require('azure-iothub').Registry;



// Connect to the service-side endpoint on your IoT hub.
var client = Client.fromConnectionString(connectionString);

// The sample connects to an IoT hub's Event Hubs-compatible endpoint to read messages sent from a device.
var { EventHubClient, EventPosition } = require('@azure/event-hubs');

function greenMessage(text) {
    console.log(chalk.green(text));
}

function redMessage(text) {
    console.log(chalk.red(text));
}

// Set the direct method name, payload, and timeout values.
var methodParams = {
    methodName: 'SetFanState',
    payload: 'on',
    responseTimeoutInSeconds: 30
};

function kickOff() {

    // Call the direct method on your device using the defined parameters.
    client.invokeDeviceMethod(deviceId, methodParams, function (err, result) {
        if (err) {
            redMessage('Failed to invoke method \'' + methodParams.methodName + '\': ' + err.message);
        } else {
            greenMessage('Response from ' + methodParams.methodName + ' on ' + deviceId + ':');
            greenMessage(JSON.stringify(result, null, 2));
        }
    });
}

var printError = function (err) {
    redMessage(err.message);
};

// Display the message content - telemetry and properties.
// - Telemetry is sent in the message body.
// - The device can add arbitrary application properties to the message.
// - IoT Hub adds system properties, such as Device Id, to the message.
var printMessage = function (message) {
    greenMessage('Telemetry received: ' + JSON.stringify(message.body) + " properties: " + JSON.stringify(message.applicationProperties));
    console.log('');
};

var eventHubClient;

// Connect to the partitions on the IoT Hub's Event Hubs-compatible endpoint.
EventHubClient.createFromIotHubConnectionString(connectionString).then(function (client) {
    greenMessage("Successfully created the EventHub Client from IoT Hub connection string.");
    eventHubClient = client;
    kickOff();
    return eventHubClient.getPartitionIds();
}).then(function (ids) {
    console.log("The partition ids are: ", ids);
    console.log('');
    return ids.map(function (id) {
        return eventHubClient.receive(id, printMessage, printError, { eventPosition: EventPosition.fromEnqueuedTime(Date.now()) });
    });
}).catch(printError);

// Locate the device twin via the Registry, then update some tags and properties.
var registry = Registry.fromConnectionString(connectionString);

registry.getTwin(deviceId, function (err, twin) {
    if (err) {
        redMessage(err.constructor.name + ': ' + err.message);
    } else {
        var desiredTemp = 12;
        var desiredHumidity = 60;
        var setDesiredValues = {
            tags: {
                customerID: 'Customer1',
                cellar: 'Cellar1'
            },
            properties: {
                desired: {
                    patchId:  "Set values",
                    temperature: desiredTemp.toString(),
                    humidity: desiredHumidity.toString()
                }
            }
        };

        twin.update(setDesiredValues, function (err) {
            if (err) {
                redMessage('Could not update twin: ' + err.constructor.name + ': ' + err.message);
            } else {
                greenMessage(twin.deviceId + ' twin updated successfully');
                queryTwins();
            }
        });
    }
});

var queryTwins = function () {
    var query = registry.createQuery("SELECT * FROM devices WHERE tags.cellar = 'Cellar1'", 100);
    query.nextAsTwin(function (err, results) {
        if (err) {
            redMessage('Failed to fetch the results: ' + err.message);
        } else {
            greenMessage("Devices in Cellar1: " + results.map(function (twin) { return twin.deviceId }).join(','));
        }
    });
};

// To do

// In docs: This example only reads messages sent after this application started.