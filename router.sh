#!/bin/bash

BASE=$(readlink -f $(dirname $0))

SUFFIX=$(date -Ins)
REQUEST_FILE=$BASE/log/request_$SUFFIX
BODY_FILE=$BASE/log/body_$SUFFIX
SERVER_OUT_FILE=$BASE/log/server_out_$SUFFIX
ADDITIONAL_HEADER=$BASE/log/additional_header_$SUFFIX
STATUS_CODE_FILE=$BASE/log/status_code_$SUFFIX
touch $BODY_FILE
touch $SERVER_OUT_FILE
touch $ADDITIONAL_HEADER
touch $STATUS_CODE_FILE

# get the header
header=()
content_length=""
while IFS= read -rd $'\r\n' line && read && [[ -n "$line" ]]; do
    if [[ ! $(echo "$line" | file --mime-type -) =~ text/plain ]]; then
        exit 1
    fi

    echo "$line" >> $REQUEST_FILE
    header+=("$line")

    if [[ "$line" =~ Content-Length:\s*\d* ]]; then
        content_length=$(echo "$line" | cut -d' ' -f2)
    fi
done

# Only try to read the payload when Content-Length is specified
if [[ -n "$content_length" ]]; then
    dd ibs=1 count=$content_length of=$BODY_FILE 2>/dev/null
fi

METHOD=$(printf "%s" ${header[0]} | awk '{ print $1 }')


get_route() {
    echo -e "${header[0]}" |
        awk '{ print $2 }' |
        sed 's/\([^?]*\)?.*/\1/'
}

route_to_file_path() {
    read route
    echo -e "$BASE/routes/$route"
}

mime_type() {
    read path

    filename="$(basename $path)"
    extension=${filename##*.}
    case $extension in
        js) echo "text/javascript" ;;
        html) echo "text/html" ;;
        css) echo "text/css" ;;
        *) file --mime-type $path | cut -d' ' -f2 ;;
    esac
}

construct_body() {
    read path
    status=200

    if [[ -d "$path" ]]; then
        path+="/index.html"
    fi
    path=$(readlink -f "$path")

    if [[ ! -e "$path" ]]; then
        status=404
        echo "Not Found" > $SERVER_OUT_FILE
        path=$SERVER_OUT_FILE

    elif [[ ! $(dirname $path) =~ $BASE/routes.* ]]; then
        echo $(dirname $path) >&2
        echo $BASE/routes >&2

        status=403
        echo "Forbidden" > $SERVER_OUT_FILE
        path=$SERVER_OUT_FILE

    elif [[ -x "$path" ]]; then
        cat $BODY_FILE | $path "$REQUEST_FILE" "$BASE" "$ADDITIONAL_HEADER" "$STATUS_CODE_FILE" > $SERVER_OUT_FILE
        status=$(cat "$STATUS_CODE_FILE")
        path=$SERVER_OUT_FILE
    fi

    echo $status
    echo $path
    echo $path | mime_type
}

status_code_line() {
    case $1 in
        200) echo "$1 OK" ;;
        404) echo "$1 Not Found" ;;
        410) echo "$1 Gone" ;;
        500) echo "$1 Internal Server Error" ;;
    esac
}

construct_http_response() {
    IFS=$'\n' read status
    IFS=$'\n' read path
    IFS=$'\n' read mime

    echo -e "${header[0]}" |
        cut -d' ' -f 1,2 |
        sed 's/\([^?]*\)?.*/\1/' |
        tr '\n' ' ' >&2
    echo "$status" >&2

    cat - <<EOF
HTTP/1.1 $(status_code_line $status)
Server: netcat
Connection: close
Content-Length: $(wc -c $path | cut -d' ' -f1)
EOF
    if [[ -s "$ADDITIONAL_HEADER" ]]; then
        cat $ADDITIONAL_HEADER
    fi
    if [[ -z "$(grep Content-Type $ADDITIONAL_HEADER)" ]]; then
        echo "Content-Type: $mime"
    fi

    echo

    if [[ $METHOD != OPTIONS ]]; then
        cat "$path"
    fi
}

get_route |
    route_to_file_path |
    construct_body |
    construct_http_response

if [[ "$1" != "--dev" ]]; then
    [[ ! -e "$REQUEST_FILE" ]] || rm $REQUEST_FILE
    [[ ! -e "$BODY_FILE" ]] || rm $BODY_FILE
    [[ ! -e "$SERVER_OUT_FILE" ]] || rm $SERVER_OUT_FILE
    [[ ! -e "$ADDITIONAL_HEADER" ]] || rm $ADDITIONAL_HEADER
fi
