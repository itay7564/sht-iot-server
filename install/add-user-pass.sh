#!/bin/bash

echo "Shtainberg IOT add user"
echo ""
if [ "$(whoami)" != 'root' ]
then
    echo "You must run this script as root."
    exit
fi

echo "Please enter username"
read -r USERNAME

sudo sh -c "echo -n '${USERNAME}:' >> /etc/nginx/.iothtpasswd"
sudo sh -c "openssl passwd -apr1 >> /etc/nginx/.iothtpasswd"

echo "Done"