#!/bin/bash

if [ "$(whoami)" != 'root' ]
  then
    echo "You must run this script as root (use sudo). Exiting."
    exit
fi

if ! cd "/etc/ssl/private/${DOMAIN}/users" ; then
	echo "Users CA directory not found. aborting."
	exit 1
fi

read -r -p "Please enter a username for the new user:" USERNAME
read -r -s -p "Please enter the CA password:" CA_PASSWORD

openssl genrsa -out "user-${USERNAME}-key.pem" 2048
openssl req -new \
	-key "user-${USERNAME}-key.pem" \
	-subj "/C=IL/O=Shtainberg-IoT /CN=${USERNAME}.users.${DOMAIN}" \
	-out "user-${USERNAME}-csr".pem

openssl x509 -req -days 36000 -CAcreateserial \
	-in "user-${USERNAME}-csr.pem" \
	-CA users-ca-crt.pem \
	-CAkey users-ca-key.pem \
	-passin "pass:${CA_PASSWORD}" \
	-out "user-${USERNAME}-crt.pem"

read -r -s -p "Please enter a new installation password for the user certificate:" PASSWORD
echo
read -r -p "Please Re-enter password:" -s PASSWORD_VERIFY
if [ "$PASSWORD" != "$PASSWORD_VERIFY" ]; then
    echo "Passwords do not match! Exiting"
    rm "*${USERNAME}*" #delete generated files
    exit
fi
echo
openssl pkcs12 -export \
	-in "user-${USERNAME}-crt.pem" \
	-inkey "user-${USERNAME}-key.pem" \
	-out "user-${USERNAME}-cert.p12" \
	-passout "pass:${PASSWORD}"

if test -f "/etc/ssl/private/${DOMAIN}/users/user-${USERNAME}-cert.p12"; then
	echo "Your new user certificate is ready at /etc/ssl/private/${DOMAIN}/users/user-${USERNAME}-cert.p12"
else
	echo "User certificate creation failed. please check that the CA password is correct"
fi

rm "user-${USERNAME}-*.pem"
