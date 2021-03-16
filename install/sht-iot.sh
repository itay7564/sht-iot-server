#!/bin/bash

echo ""
echo "### sht-iot ### Shtainberg IoT ###"
echo "### by Itay Shtainberg ### 2017-2021 ###"
echo ""

if [ "$(whoami)" != 'root' ]
  then
    echo "You must run this script as root. Try running: \"sudo sht-iot COMMAND\" "
    exit
fi

showUsage () { 
	echo -e \
"Usage: sht-iot COMMAND
Available commands:
	start\t-\tStarts the sht-iot server if it was stopped.\nThis command is ignored if the server is already running.
	stop\t-\tStops the sht-iot server. This will cause devices to lose connection.
	restart\t-\tRestarts the sht-iot server. This will cause devices to lose connection.
	add-user\t-\tGenerates a new certificates for users.
	add-device\t-\tGenerates a new certificates for devices.
	update FILE\t-\tCopy the arduino binary (specified FILE) to the sht-iot update directory"
}


cmd="$1"

if [ "${cmd}" = "start" ]; then
	if ! systemctl is-active --quiet sht-iot-node ; then
		systemctl start sht-iot-node
	elif ! systemctl is-active --quiet nginx ; then
		systemctl start nginx
	fi
elif [ "${cmd}" = "stop" ]; then
	systemctl stop sht-iot-node
	systemctl stop nginx
	echo "stopped server"
elif [ "${cmd}" = "restart" ]; then
	systemctl restart sht-iot-node
	systemctl restart nginx
	echo "restarted server"
elif [ "${cmd}" = "add-user" ]; then
	/opt/sht-iot/get-user-cert.sh
elif [ "${cmd}" = "add-device" ]; then
	/opt/sht-iot/get-device-cert.sh
elif [ "${cmd}" = "update" ]; then
	if [ "$#" -ne 2 ]; then
    		echo "Error: Invalid number of arguments for update command"
		showUsage
		exit 1
	fi
	if [ -f "$2" ]; then
		cp "$2" /opt/sht-iot/updates/
	else
		echo "File $2 does not exist"
		exit 1
	fi
else 
	echo "Error: Invalid command"
	showUsage
	exit 1
fi
