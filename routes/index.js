let mime = "";

/**
 * @param {string} htmlStr
 */
function create_element(htmlStr) {
    let frag = document.createDocumentFragment();
    let temp = document.createElement('div');
    temp.innerHTML = htmlStr;
    while (temp.firstChild) {
        frag.appendChild(temp.firstChild);
    }
    return frag;
}

function preflight_fragment() {
    return create_element(
        '<button id="preflight" type="button" onclick="preflight()">' +
            'Preflight' +
        '</button>');
}

function preflight() {
    // const image_elem = document.getElementById("image");
    // if (image_elem !== null) {
    //     image_elem.remove();
    // }

    const uri = window.location + "api/v1/copy-from-clipboard";
    setTimeout(async () => {
        const res = await fetch(uri, { method: "options" });
        if (res.status !== 200) {
            window.alert("Nothing to copy?");
        }

        mime = res.headers.get("Content-Type");
        if (mime.startsWith("text/")) {
            const fragment = create_element(
                '<button id="copy" type="button" onclick="copy()">' +
                    'Copy' +
                '</button>');
            document.getElementById("preflight").replaceWith(fragment);
            return;
        }
        if (mime.startsWith("image/")) {
            const fragment = create_element(
                `<img id="image" src="${uri}" onclick="reset()"/>`
            );
            document.getElementById("preflight").replaceWith(fragment);
            return;
        }
    });
}

function copy() {
    const uri = window.location + "api/v1/copy-from-clipboard";
    setTimeout(async () => {
        const blob_promise = async () => {
            const res = await fetch(uri);
            return await res.blob()
        };
        await navigator.clipboard.write([
            new ClipboardItem({
                [mime]: blob_promise()
            })
        ])

        document.getElementById("copy").replaceWith(preflight_fragment());
    });
}

function reset() {
    const image_elem = document.getElementById("image");
    image_elem.replaceWith(preflight_fragment());
}

function paste() {
    const uri = window.location + "api/v1/paste-to-clipboard";
    setTimeout(async () => {
        try {
            const items = await navigator.clipboard.read();
            if (items.length === 0 || items[0].types.length === 0) {
                window.alert("Nothing to paste");
                return;
            }
            const type = items[0].types[0];
            const blob = await items[0].getType(type);

            let fragment = create_element(
                '<div>' +
                    '<progress id="progress"></progress>' +
                '</div>');
            document.getElementById("paste").append(fragment);

            let progress = document.getElementById("progress");
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener("progress", (event) => {
                if (event.lengthComputable) {
                    progress.value = event.loaded / event.total;
                }
            });
            xhr.addEventListener("loadend", () => {
                if (xhr.readyState === 4) {
                    progress.remove();
                } else {
                    return;
                }
                if (xhr.status !== 200) {
                    window.alert(xhr.responseText);
                }
            });
            xhr.addEventListener("error", (_) => {
                window.alert("Error pasting to clipboard");
            });
            xhr.open("PUT", uri, true);
            xhr.setRequestHeader("Content-Type", blob.type);
            xhr.send(blob);
        } catch (err) {
            console.log(err);
        }
    });
}
