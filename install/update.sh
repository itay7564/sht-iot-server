echo "Shtainberg IOT server updater"
echo ""
if [ "$(whoami)" != 'root' ]
then
    echo "You must run this script as root. Try running: \"sudo install.sh\" "
    exit
fi

echo "You can only run this script after installing sht-iot successfuly. run install.sh to do so."
echo "Also, verify that this clone of  https://github.com/itay7564/sht-iot-server/ is up-to-date"
read -p "To continue press enter, to exit press Ctrl+C" REPLY 


cp sht-iot.sh /opt/sht-iot/
cp ../src/sht-iot-server/sht-iot-server.js /opt/sht-iot/
cp ../src/sht-iot-server/package.json /opt/sht-iot/
cp -R ../src/sht-iot-server/dist/ /opt/sht-iot/

chmod -R 755 /opt/sht-iot/

systemctl daemon-reload
systemctl enable sht-iot-node
systemctl restart sht-iot-node
systemctl restart nginx

echo "Note that this update is partial and does not cover nginx and TLS configurations"
echo "To update secure features like those, you have to run install.sh and enter your passwords"
echo "Done updating sht-iot server. Cross fingers!"
