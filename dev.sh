#!/bin/bash

BASE=$(dirname $0)

PORT=9001
shift

stop() {
    pid=$(lsof -i :$PORT | tail -1 | awk '{ print $2 }')
    if [[ -n $pid ]]; then
        kill $pid
    fi
    if $1; then
        pkill stunnel
        exit
    fi
}

trap "stop true" SIGINT

restart() {
    echo "restart"
    stop false
    ncat -lk \
        $PORT $@ \
        -c "$BASE/router.sh --dev" &
}

echo "Start TLS proxy"
stunnel $BASE/stunnel.conf

restart
prev=$(shasum $BASE/router.sh)
while true; do
    now=$(shasum $BASE/router.sh)
    if [[ "$prev" != "$now" ]]; then
        prev="$now"
        restart
    fi
    sleep 1
done
