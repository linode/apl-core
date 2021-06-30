#!/usr/bin/env bash
ok="HTTP/1.0 200 OK\r\nContent-length: 2\r\n\r\nOK\r\n"
err="HTTP/1.0 500 Internal Server Error\r\nContent-length: 21\r\n\r\nInternal Server Error\r\n"
request=
while IFS= read -r line && [ "$request" = "" ]; do
  if [[ $line = "GET /"* ]]; then
    request=${line#* } # delete everything up to first space in $line
  fi
done
# health check?
if [ "${request:1:1}" = " " ]; then printf "$ok" && exit; fi
# other request:
mode=${request:1:8}
if [ "$mode" != "decrypt " ] && [ "$mode" != "encrypt " ]; then
  echo "No valid request: '$mode'. Should be one of: decrypt|encrypt" >&2
  printf "$err"
  exit
fi

echo "request: $mode" >&2

if bin/crypt.sh $mode >&2; then
  echo "Successful crypt action. Sending http 200 response."
  printf "$ok"
else
  echo "An unknown error occurred. Sending http 500 response." >&2
  printf "$err"
fi
