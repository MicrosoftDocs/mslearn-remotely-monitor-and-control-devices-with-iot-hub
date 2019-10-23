---
page_type: sample
languages:
- javascript
products:
- azure-iot-hub
description: "This sample is the source code created in the Remotely monitor and control devices with IoT Hub Learn module. The scenario is a cheese cave."
urlFragment: "remotely-monitor-and-control-devices-with-iot-hub"
---

# Remotely monitor and control devices with IoT Hub Learn module

<!-- 
Guidelines on README format: https://review.docs.microsoft.com/help/onboard/admin/samples/concepts/readme-template?branch=master

Guidance on onboarding samples to docs.microsoft.com/samples: https://review.docs.microsoft.com/help/onboard/admin/samples/process/onboarding?branch=master

Taxonomies for products and languages: https://review.docs.microsoft.com/new-hope/information-architecture/metadata/taxonomies?branch=master
-->

The sample here provides the source code that is created with the Remotely monitor and control devices with IoT Hub Learn module. This module creates an Azure IoT Hub app, to monitor the temperature and humidty of a cheese cave. A device app, written in Node.js, sends telemetry to the IoT Hub, which uses Device Twins and Direct Method technologies to control the settings of the cheese cave.

## Contents

| File/folder       | Description                                |
|-------------------|--------------------------------------------|
| `Device/app.js`   | Sample source code for the device          |
| `Hub/app.js`      | Sample source code for the back-end service |
| `.gitignore`      | Define what to ignore at commit time.      |
| `CHANGELOG.md`    | List of changes to the sample.             |
| `CONTRIBUTING.md` | Guidelines for contributing to the sample. |
| `README.md`       | This README file.                          |
| `LICENSE`         | The license for the sample.                |

## Prerequisites

The student of the module will need familiarity with the Azure IoT Hub portal. The code development can be done using Visual Studio, or Visual Studio Code. The code itself is written in Node.js.

## Setup

The setup is explained in the text for the module. The module does not require the student to download the code from this location, the code is listed and explained in the Learn module. The code here is a resource if the student needs it.

## Runnning the sample

Running the sample requires that the student go through all the steps of the Learn module.

## Key concepts

The sample simulates the temperature and humidity of a cheese cave, so showing how to communicate from an external device with an Azure IoT Hub.The sample also includes code for a back-end service, that is used to send desired properties to the remote device, using Azure Device Twins, and to control the device using Direct Methods.

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
