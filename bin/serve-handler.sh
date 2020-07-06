#!/usr/bin/env bash
ok="HTTP/1.0 200 OK\r\nContent-length: 2\r\n\r\nOK\r\n"
err="HTTP/1.0 500 Internal Server Error\r\nContent-length: 21\r\n\r\nInternal Server Error\r\n"
mode=
while IFS= read -r line && [ "$mode" = "" ]; do
  if [[ $line = "GET /"* ]]; then
    request=${line#* } # delete everything up to first space in $line
    mode=${request:1:4}
  fi
done
if [ "$mode" = " " ]; then printf "$ok" && exit; fi
if [ "$mode" != "dec " ] && [ "$mode" != "enc " ]; then
  echo "No valid request: '$mode'. Should be one of: dec|enc" >&2
  printf "$err"
  exit
fi

echo "request: $mode" >&2

if bin/crypt.sh $mode >&2; then printf "$ok"; else printf "$err"; fi
