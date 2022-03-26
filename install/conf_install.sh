echo -e "Domain Name:\c"
read -r DOMAIN
echo -e "Web user interface port (to be part of the websites url):\c"
read -r USER_PORT
echo -e "User port (no user cert):\c"
read -r USER_PORT_NO_CERT
echo -e "Device port:\c"
read -r DEVICE_PORT
echo -e "Device Update port:\c"
read -r DEVICE_UPDATE_PORT

echo "Before continuing, you need to port-forward the ports you selected and set a static IP address for this machine"
echo "For more information google \"Port forwarding\" and \"How to set a static IP on Ubuntu/Debian\""
echo "When you are done press ENTER"
read -r

echo "Setting up nginx configuration..."
sed -e "s/\${DOMAIN}/${DOMAIN}/" \
	-e "s/\${USER_PORT}/${USER_PORT}/" \
	-e "s/\${DEVICE_PORT}/${DEVICE_PORT}/" \
	-e "s/\${DEVICE_UPDATE_PORT}/${DEVICE_UPDATE_PORT}/" \
	-e "s/\${USER_PORT_NO_CERT}/${USER_PORT_NO_CERT}/" \
	nginx-template.conf > /etc/nginx/sites-available/sht-iot-server.conf
