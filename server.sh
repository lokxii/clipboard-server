#!/bin/bash

BASE=$(dirname $0)

mkdir /tmp/clipboard-server/
LOG=/tmp/clipboard-server/log.txt

stop() {
    pid=$(lsof -i :9001 | tail -1 | awk '{ print $2 }')
    if [[ -n $pid ]]; then
        kill $pid
    fi
    pkill stunnel
    exit
}

trap stop SIGINT

echo "Starting TLS proxy" >>$LOG
echo "Using stunnel debug 6 config $BASE/stunnel.conf" >>$LOG
until stunnel $BASE/stunnel.conf 2>>$LOG; do
    pgrep stunnel && break
    sleep 1
done

echo "Start http server" >>$LOG
until ncat -lk 9001 -e "$BASE/router.sh" >>$LOG; do
    echo "Restarting ncat" >>$LOG
    sleep 1
done
