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

echo "Start TLS proxy"
stunnel $BASE/stunnel.conf

echo "Start http server"
ncat -lk 9001 -e "$BASE/router.sh"
