#!/bin/bash
curl -s -X GET "https://www.duckdns.org/update?domains={${DOMAIN}}&token={${TOKEN}}&txt={$CERTBOT_VALIDATION}"
sleep 3

