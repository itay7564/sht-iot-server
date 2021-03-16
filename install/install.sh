#!/bin/bash
echo "Shtainberg IOT server installer"
echo ""
if [ "$(whoami)" != 'root' ]
then
    echo "You must run this script as root. Try running: \"sudo install.sh\" "
    exit
fi

apt update -q
echo "Installing Certbot..."
apt-get install certbot
echo "Done."
echo "Installing nginx..."
apt install nginx
echo "Done."
echo "Installing cURL..."
apt install curl
echo "Done."
echo "Installing NodeJS..."
apt install npm
npm list npm -g || npm install -g npm@latest
npm install -g n
n lts
v=$(node -v)
echo "Done. Version - $v"
#Main program folder: /opt/sht-iot
mkdir /opt/sht-iot
mkdir /opt/sht-iot/updates
cp sht-iot.sh /opt/sht-iot/
ln -s /opt/sht-iot/sht-iot.sh /usr/sbin/sht-iot
cp ../src/sht-iot-server/sht-iot-server.js /opt/sht-iot/
cp ../src/sht-iot-server/package.json /opt/sht-iot/


cp -R ../src/sht-iot-server/dist/ /opt/sht-iot/

if [ -d "/opt/sht-iot/node_modules" ] 
then
    echo "Node modules already installed" 
else
    npm --prefix /opt/sht-iot/ install /opt/sht-iot/ --only=production
fi


#after setting up /opt/sht-iot/:
chmod -R 755 /opt/sht-iot/

#DuckDNS config
echo "Please enter your duckDNS domain name: (eg. \"example-server.duckdns.org\")"
read -r DOMAIN

echo "Please enter your duckDNS token:"
read -r TOKEN

sed -e "s/\${DOMAIN}/${DOMAIN}/" ./get-device-cert.sh > /opt/sht-iot/get-device-cert.sh
sed -e "s/\${DOMAIN}/${DOMAIN}/" ./get-user-cert.sh > /opt/sht-iot/get-user-cert.sh

#DuckDNS ip refersh
echo "Setting up a cron job to update the DDNS IP address..."
DDNS_CRON_CMD="curl -X GET \"https://www.duckdns.org/update?domains={${DOMAIN}}&token={${TOKEN}}\""
DDNS_CRON_JOB="*/3 *  *   *   * $DDNS_CRON_CMD"
DDNS_CRON_DESCRIPTION="#sht-iot duckDNS ip address update"
( crontab -l | grep -v -F "$DDNS_CRON_DESCRIPTION" ; echo "$DDNS_CRON_DESCRIPTION" ) | crontab -
( crontab -l | grep -v -F "$DDNS_CRON_CMD" ; echo "$DDNS_CRON_JOB" ) | crontab -
echo "Done"

#certbot renewal scripts
echo "Setting up certbot hooks for certificate vertification..."
mkdir /etc/letsencrypt/renewal-hooks/auth
sed -e "s/\${TOKEN}/${TOKEN}/" -e "s/\${DOMAIN}/${DOMAIN}/" \
	certbot-auth-template.sh > /etc/letsencrypt/renewal-hooks/auth/sht-iot-auth.sh
chmod 710 /etc/letsencrypt/renewal-hooks/auth/sht-iot-auth.sh

sed -e "s/\${TOKEN}/${TOKEN}/" -e "s/\${DOMAIN}/${DOMAIN}/" \
	certbot-clean-template.sh > /etc/letsencrypt/renewal-hooks/post/sht-iot-clean.sh
chmod 710 /etc/letsencrypt/renewal-hooks/post/sht-iot-clean.sh
echo "Done"

#get Let's Encrypt certificate
echo "Attempting to get a Let's Encrypt certificate, please answer certbot's questions"
certbot certonly --manual --preferred-challenges dns -d "${DOMAIN}" \
	--manual-auth-hook /etc/letsencrypt/renewal-hooks/auth/sht-iot-auth.sh 
echo "Testing certificate renewal"
certbot renew --dry-run --manual-auth-hook /etc/letsencrypt/renewal-hooks/auth/sht-iot-auth.sh

#Self signed ca's
echo
echo "Generating self signed CA's for users and devices"

while :
do
	echo "Please enter a password for the CA's. Write it down in a secure place (not a computer):"
	read -r -s CA_PASS 
	read -r -p "Please Re-enter password:" -s CA_PASS_VERIFY
	if [ "$CA_PASS" == "$CA_PASS_VERIFY" ]
	then
		break
	fi
    echo "Passwords do not match! retry"
done

mkdir "/etc/ssl/private/${DOMAIN}/"
USERS_CERT_DIR="/etc/ssl/private/${DOMAIN}/users"
DEVICES_CERT_DIR="/etc/ssl/private/${DOMAIN}/devices"
mkdir "$USERS_CERT_DIR"
mkdir "$DEVICES_CERT_DIR"


if [ ! -f USERS_CERT_DIR/users-ca-crt.pem ]
then
	openssl req -new -x509 -days 36000 \
	-subj "/C=IL/O=Shtainberg-IoT/CN=ca.users.${DOMAIN}"  	\
	-passout pass:"$CA_PASS" \
	-keyout "$USERS_CERT_DIR/users-ca-key.pem" \
	-out "$USERS_CERT_DIR/users-ca-crt.pem"
fi

if [ ! -f DEVICES_CERT_DIR/devices-ca-key.pe ]
then
openssl req -new -x509 -days 36000 \
	-subj "/C=IL/O=Shtainberg-IoT/CN=ca.devices.${DOMAIN}"	\
	-passout pass:"$CA_PASS" \
	-keyout "$DEVICES_CERT_DIR/devices-ca-key.pem" \
	-out "$DEVICES_CERT_DIR/devices-ca-crt.pem"
fi
#self signed ca's end

#Port selection before nginx configuration
echo "Please enter ports for the server. I recommend using any ports from 10000 to 30000 (Do not use 22550 - 22552):"
echo "For more information, visit https://en.wikipedia.org/wiki/List_of_TCP_and_UDP_port_numbers"
echo -e "Web user interface port (to be part of the websites url):\c"
read -r USER_PORT
echo -e "Device port:\c"
read -r DEVICE_PORT
echo -e "Device Update port:\c"
read -r DEVICE_UPDATE_PORT

echo "Before continuing, you need to port-forward the ports you selected and set a static IP address for this machine"
echo "For more information google \"Port forwarding\" and \"How to set a static IP on Ubuntu/Debian\""
echo "When you are done press ENTER"
read -r

#nginx
echo "Setting up nginx configuration..."
sed -e "s/\${DOMAIN}/${DOMAIN}/" \
	-e "s/\${USER_PORT}/${USER_PORT}/" \
	-e "s/\${DEVICE_PORT}/${DEVICE_PORT}/" \
	-e "s/\${DEVICE_UPDATE_PORT}/${DEVICE_UPDATE_PORT}/" \
	nginx-template.conf > /etc/nginx/sites-available/sht-iot-server.conf

ln -s /etc/nginx/sites-available/sht-iot-server.conf /etc/nginx/sites-enabled/sht-iot-server.conf

#Remember to restart nginx after setting up node server (and remove this comment)


#node server service setup 
echo "please select a non-root user which will run the node.js server. This is a list of current users:"
awk -F: '($3>=1000)&&($1!="nobody"){print $1}' /etc/passwd
read -r -p "Your user:" SERVICE_USER
GROUP_NAMES=($(id -nG "${SERVICE_USER}"))
GROUP_IDS=($(id -G "${SERVICE_USER}"))
echo "Please select the user group for the user from this list:"
for i in "${!GROUP_NAMES[@]}"; do
	if [ "${GROUP_IDS[$i]}" -ge 1000 ]; then
		echo "${GROUP_NAMES[$i]}"
    fi
done
read -r -p "Your group:" SERVICE_GROUP

#todo: verify the user and group are valid

sed -e "s/\${SERVICE_USER}/${SERVICE_USER}/" \
	-e "s/\${SERVICE_GROUP}/${SERVICE_GROUP}/" \
	./sht-iot-node.service >  /etc/systemd/system/sht-iot-node.service

systemctl daemon-reload
systemctl enable sht-iot-node
systemctl restart sht-iot-node
systemctl restart nginx
echo "Done installing sht-iot server. Cross fingers!"

