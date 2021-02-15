# sht-iot-server
A simple IoT server to run on a local network, and access home devices from anywhere for free.

# Note: this server is under development and was not tested extensively yet.

The server is impleneteted with Node.JS and nginx as a reverse proxy and static webserver.
Certbot is used to get free Let's Encrypt certificates, and OpenSSL to create local CA's with clients certificates for the users and devices.

There server is comprised of three parts:
* Devices server: A Server for devices, which are PCB's with a WiFi microcontroller (ESP8266) which is programmed with Arduino.
These devices control electronically home appliances such as: a boiler, an air conditioner, an electric shutter, etc.

* Devices update server: When booting up, the devices WiFi microcontroller will connect to this server to check for software update.
If the server finds a new version of the Arduino code, it will send the update over-the-air (OTA) and the microcontroller will update itself without a physical connection.

* User server: An interactive website made with React JS, which is served to users who wish to control the devices.
The static site javascript is served by nginx, and the dynamic data is handled with the node server.

All of these three sides are encrypted with TLS, using free Let's Encrypt certificates, and using client certificates to authenticate the users and the devices which connect to the server.
Each of these three sides is available on a different TCP port, selected on installation.

The server is using a free DDNS service called duckDNS, which allows having a constant domain name for the changing ip address of the home router.



# Server Flowchart
![This diagram shows the flow of the server](https://github.com/itay7564/sht-iot-server/blob/main/connection%20diagram.jpg?raw=true)



# Requirements
* A 24/7 working computer with a debian based linux distro installed. I use a raspberry pi zero W.
* Root access.

# Installation
* Clone the repository or download the `dist` folder
* Extract the files.
* in the terminal run:
`cd /path/to/sht-iot-server/dist/`
`chmod +x install.sh`
`install.sh` (as a root user).
* Follow the prompt. this may take several minutes or more depending on your internet connection.

# Usage:
after installing, it is recommended to run:
`sudo sht-iot restart`
to restart, start, or stop the server at any time, run:
`sudo sht-iot start`
`sudo sht-iot stop`
`sudo sht-iot restart`
To generate a new client certificate for a user, run:
`sudo sht-iot add-user`
To generate a new client certificate for a device, run:
`sudo sht-iot add-device`
To move a file to the updates folder, so it will be used to update a device through the updates server, use:
`sudo sht-iot update PATH_TO_FILE`

# Software used:
The following programs will be installed after running `install.sh` (if they are not already installed):
- snap package manager
- certbot
- nginx
- curl
- nodejs
- npm
