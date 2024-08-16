#!/bin/bash

BASE=$(dirname $0)

stop() {
    pid=$(lsof -i :9001 | tail -1 | awk '{ print $2 }')
    if [[ -n $pid ]]; then
        kill $pid
    fi
    pkill stunnel
    exit
}

trap stop SIGINT

echo "Starting TLS proxy"
while ! stunnel $BASE/stunnel.conf; do
    pgrep stunnel && break
    sleep 1
done

echo "Start http server"
ncat -lk 9001 -e "$BASE/router.sh"
