// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

using System;
using System.Threading.Tasks;
using System.Text;
using System.Collections.Generic;
using System.Linq;

using Microsoft.Azure.EventHubs;
using Microsoft.Azure.Devices;
using Newtonsoft.Json;

namespace cheesecave_operator
{
    class ReadDeviceToCloudMessages
    {
        // The Event Hub-compatible endpoint.
        private readonly static string s_eventHubsCompatibleEndpoint = "<your event hub endpoint>";

        // The Event Hub-compatible name.
        private readonly static string s_eventHubsCompatiblePath = "<your event hub path>";
        private readonly static string s_iotHubSasKey = "<your event hub Sas key>";
        private readonly static string s_iotHubSasKeyName = "service";
        private static EventHubClient s_eventHubClient;
        private static ServiceClient s_serviceClient;

        // Connection string for your IoT Hub
        private readonly static string s_serviceConnectionString = "<your service connection string>";

        // Asynchronously create a PartitionReceiver for a partition and then start 
        // reading any messages sent from the simulated client.
        private static async Task ReceiveMessagesFromDeviceAsync(string partition)
        {
            // Create the receiver using the default consumer group.
            // For the purposes of this sample, read only messages sent since 
            // the time the receiver is created. Typically, you don't want to skip any messages.
            var eventHubReceiver = s_eventHubClient.CreateReceiver("$Default", partition, EventPosition.FromEnqueuedTime(DateTime.Now));
            Console.WriteLine("Created receiver on partition: " + partition);

            while (true)
            {
                // Check for EventData - this methods times out if there is nothing to retrieve.
                var events = await eventHubReceiver.ReceiveAsync(100);

                // If there is data in the batch, process it.
                if (events == null) continue;

                foreach (EventData eventData in events)
                {
                    string data = Encoding.UTF8.GetString(eventData.Body.Array);

                    greenMessage("Telemetry received: " + data);

                    foreach (var prop in eventData.Properties)
                    {
                        if (prop.Value.ToString() == "true")
                        {
                            redMessage(prop.Key);
                        }
                    }
                    Console.WriteLine();
                }
            }
        }

        public static void Main(string[] args)
        {
            colorMessage("Cheese Cave Operator\n", ConsoleColor.Yellow);

            // Create an EventHubClient instance to connect to the IoT Hub Event Hubs-compatible endpoint.
            var connectionString = new EventHubsConnectionStringBuilder(new Uri(s_eventHubsCompatibleEndpoint), s_eventHubsCompatiblePath, s_iotHubSasKeyName, s_iotHubSasKey);
            s_eventHubClient = EventHubClient.CreateFromConnectionString(connectionString.ToString());

            // Create a PartitionReciever for each partition on the hub.
            var runtimeInfo = s_eventHubClient.GetRuntimeInformationAsync().GetAwaiter().GetResult();
            var d2cPartitions = runtimeInfo.PartitionIds;

            // A registry manager is used to access the digital twins.
            registryManager = RegistryManager.CreateFromConnectionString(s_serviceConnectionString);
            SetTwinProperties().Wait();

            // Create a ServiceClient to communicate with service-facing endpoint on your hub.
            s_serviceClient = ServiceClient.CreateFromConnectionString(s_serviceConnectionString);
            InvokeMethod().GetAwaiter().GetResult();

            // Create receivers to listen for messages.
            var tasks = new List<Task>();
            foreach (string partition in d2cPartitions)
            {
                tasks.Add(ReceiveMessagesFromDeviceAsync(partition));
            }

            // Wait for all the PartitionReceivers to finsih.
            Task.WaitAll(tasks.ToArray());
        }

        private static void colorMessage(string text, ConsoleColor clr)
        {
            Console.ForegroundColor = clr;
            Console.WriteLine(text);
            Console.ResetColor();
        }
        private static void greenMessage(string text)
        {
            colorMessage(text, ConsoleColor.Green);
        }

        private static void redMessage(string text)
        {
            colorMessage(text, ConsoleColor.Red);
        }

        // Handle invoking a direct method.
        private static async Task InvokeMethod()
        {
            try
            {
                var methodInvocation = new CloudToDeviceMethod("SetFanState") { ResponseTimeout = TimeSpan.FromSeconds(30) };
                string payload = JsonConvert.SerializeObject("on");

                methodInvocation.SetPayloadJson(payload);

                // Invoke the direct method asynchronously and get the response from the simulated device.
                var response = await s_serviceClient.InvokeDeviceMethodAsync("CheeseCaveIDC", methodInvocation);

                if (response.Status == 200)
                {
                    greenMessage("Direct method invoked: " + response.GetPayloadAsJson());
                }
                else
                {
                    redMessage("Direct method failed: " + response.GetPayloadAsJson());
                }
            }
            catch
            {
                redMessage("Direct method failed: timed-out");
            }
        }

        // Device twins section.
        // Digital twins
        private static RegistryManager registryManager;

        private static async Task SetTwinProperties()
        {
            var twin = await registryManager.GetTwinAsync("CheeseCaveIDC");
            var patch =
                @"{
                    tags: {
                        customerID: 'Customer1',
                        cellar: 'Cellar1'
                    },
                    properties: {
                        desired: {
                            patchId: 'set values',
                            temperature: '50',
                            humidity: '85'
                        }
                    }
            }";
            await registryManager.UpdateTwinAsync(twin.DeviceId, patch, twin.ETag);

            var query = registryManager.CreateQuery(
              "SELECT * FROM devices WHERE tags.cellar = 'Cellar1'", 100);
            var twinsInCellar1 = await query.GetNextAsTwinAsync();
            Console.WriteLine("Devices in Cellar1: {0}",
              string.Join(", ", twinsInCellar1.Select(t => t.DeviceId)));
        }
    }    
}

