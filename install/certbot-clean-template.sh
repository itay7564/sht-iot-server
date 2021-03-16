#!/bin/bash
curl -s -X GET "https://www.duckdns.org/update?domains={${DOMAIN}}&token={${TOKEN}}&txt={1}&clear=true"
sleep 1
systemctl reload nginx
