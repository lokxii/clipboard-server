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

function paste_fragment() {
    return create_element(
        '<button id="paste" type="button" onclick="paste()">' +
            'Paste' +
        '</button>');
}

function copy_fragment() {
    return create_element(
        '<button id="copy" type="button" onclick="preflight()">' +
            'Copy' +
        '</button>');
}

/**
 * @param {string} uri
 */
function image_fragment(uri) {
    return create_element(
        `<img id="image" src="${uri}""/>`
    );
}

function reset_fragment() {
    return create_element(
        '<button id="reset" type="button" onclick="reset()">' +
            "Reset" +
        '</button>'
    )
}

function preflight() {
    const uri = window.location + "api/v1/copy-from-clipboard";
    setTimeout(async () => {
        const res = await fetch(uri, { method: "options" });
        if (res.status !== 200) {
            window.alert("Nothing to copy?");
        }

        const mime = res.headers.get("Content-Type");
        if (mime.startsWith("text/")) {
            setTimeout(async () => {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        [mime]: Promise.resolve(await res.text())
                    })
                ]);
            });
            return;
        }
        if (mime.startsWith("image/")) {
            document.getElementById("copy").replaceWith(image_fragment(uri));
            document.getElementById("paste").replaceWith(reset_fragment());
            return;
        }
    });
}

function reset() {
    document.getElementById("reset").replaceWith(paste_fragment());
    document.getElementById("image").replaceWith(copy_fragment());
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
