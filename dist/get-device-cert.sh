#!/bin/bash

if [ "$(whoami)" != 'root' ]
  then
    echo "You must run this script as root (use sudo). Exiting."
    exit
fi

if ! cd "/etc/ssl/private/${DOMAIN}/devices" ; then
	echo "Devices CA directory not found. aborting."
	exit 1
fi

read -r -p "Please enter a device name for the new device:" USERNAME
read -r -s -p "Please enter the CA password:" CA_PASSWORD

openssl genrsa -out "device-${USERNAME}-key.pem" 2048
openssl req -new \
	-key "device-${USERNAME}-key.pem" \
	-subj "/C=IL/O=Shtainberg-IoT /CN=${USERNAME}.devices.${DOMAIN}" \
	-out "device-${USERNAME}-csr".pem

openssl x509 -req -days 36000 -CAcreateserial \
	-in "device-${USERNAME}-csr.pem" \
	-CA devices-ca-crt.pem \
	-CAkey devices-ca-key.pem \
	-passin "pass:${CA_PASSWORD}" \
	-out "device-${USERNAME}-crt.pem"


if test -f "/etc/ssl/private/${DOMAIN}/devices/device-${USERNAME}-crt.pem"; then
	echo "Your new device certificate is ready at /etc/ssl/private/${DOMAIN}/devices/device-${USERNAME}-crt.pem"
	echo "And the key is in /etc/ssl/private/${DOMAIN}/devices/device-${USERNAME}-key.pem"
else
	echo "Device certificate creation failed. please check that the CA password is correct"
fi
rm "device-${USERNAME}-csr.pem"
