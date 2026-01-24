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

function select_file() {
    document.getElementById("file-selector").click();
}

function upload_progress_fragment() {
    return create_element(
        '<div>' +
            '<progress id="upload-progress"></progress>' +
        '</div>'
    );
}

function download_progress_fragment() {
    return create_element(
        '<div>' +
            '<progress id="download-progress"></progress>' +
        '</div>'
    );
}

function select_file_fragment() {
    return create_element(
        '<button id="select-file" type="button" onclick="select_file()">' +
            'Select File' +
        '</button>'
    );
}

/** @type {File | null} */
let file = null;

document.getElementById("file-selector").onchange = (ev) => {
    file = ev.target.files[0]
    let filename = file.name.length < 15 ?
        file.name :
        file.name.slice(0, 15) + '...';
    let fragment = create_element(
        '<button id="upload" type="button" onclick="upload()">' +
            'Upload<br>' + filename +
        '</button>');
    document.getElementById("select-file").replaceWith(fragment);
}

async function initiate_upload() {
    try {
        let r = await fetch("/api/v1/multipart-upload/start", {
            method: "GET",
            body: `${file.name}\r\n${file.size}\r\n`,
        });
        return await r.json();
    } catch (err) {
        console.log(err);
        alert("Cannot initiate file upload");
        file = null;
        document.getElementById("upload").replaceWith(select_file_fragment());
        throw null;
    }
}

function upload() {
    let uploadButton = document.getElementById("upload");
    uploadButton.append(upload_progress_fragment());
    uploadButton.disabled = true;
    let progress = document.getElementById("upload-progress");

    setTimeout(async () => {
        /** @type {{upload_id: string, chunk_size: number, n_chunks: number}} */
        const {
            upload_id: upload_id,
            chunk_size: chunk_size,
            n_chunks: n_chunks
        } = await initiate_upload();
        let uploaded_bytes = 0;
        let sent_chunks = 0;

        const onfinish = () => {
            progress.remove();
            uploadButton.replaceWith(select_file_fragment());

            if (uploaded_bytes !== content.byteLength) {
                alert("Upload failed");
            }
            let xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/v1/multipart-upload/end");
            xhr.setRequestHeader("Upload-Id", upload_id);
            xhr.onloadend = (ev) => {
                if (xhr.readyState !== 4) {
                    return;
                }
                switch (xhr.status) {
                    case 200: break;
                    case 500: alert("Upload failed (server error)"); break;
                }
            };
            xhr.onerror = (ev) => {
                alert("Network error; Cannot confirm upload status");
            }
        };

        let reader = new FileReader();
        reader.onload = (_) => {
            let content = reader.result;

            for (let i = 0; i < n_chunks; i++) {
                let end = (i + 1) * chunk_size;
                end = end < content.byteLength ? end : content.byteLength;
                const slice = content.slice(i * chunk_size, end);

                const send_chunk = () => {
                    let xhr = new XMLHttpRequest();
                    xhr.open("PUT", "/api/v1/multipart-upload/chunk");
                    xhr.setRequestHeader("Upload-Id", upload_id);
                    xhr.setRequestHeader("Chunk-Index", i.toString());
                    xhr.onprogress = (ev) => {
                        if (ev.lengthComputable) {
                            uploaded_bytes += ev.loaded;
                            progress.value = uploaded_bytes / content.byteLength;
                        }
                    };
                    xhr.onloadend = (ev) => {
                        if (xhr.readyState !== 4) {
                            return;
                        }
                        switch (xhr.status) {
                            case 200:
                                sent_chunks += 1;
                                if (sent_chunks === n_chunks) {
                                    onfinish();
                                }
                                break;
                            case 428: console.log("Didn't call /api/v1/multipart-upload/start ?"); break;
                            case 405: console.log("Not PUT request; Shouldn't happen"); break;
                            case 412: console.log("Incorrect upload-id"); break;
                            case 400: console.log("Invalid chunk-index"); break;
                            case 408:
                                console.log("Chunk upload failed; Retrying");
                                uploaded_bytes -= ev.loaded;
                                progress.value = uploaded_bytes / content.byteLength;
                                send_chunk();
                                break;
                        }
                    };
                    xhr.onerror = (ev) => {
                        console.log("Chunk upload failed (error); Retrying");
                        uploaded_bytes -= ev.loaded;
                        progress.value = uploaded_bytes / content.byteLength;
                        send_chunk();
                    }
                    xhr.send(slice);
                };
            }
        }
        reader.onerror = (_) => {
            alert("Cannot read file");
            file = null;
            document.getElementById("upload").replaceWith(select_file_fragment());
            throw null;
        }
        reader.readAsArrayBuffer(file);
    });
}

function download() {
    let downloadButton = document.getElementById("download");
    downloadButton.append(download_progress_fragment());
    download.disabled = true;

    let progress = document.getElementById("download-progress");
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/v1/download");
    xhr.responseType = "blob";
    xhr.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
            progress.value = event.loaded / event.total;
        }
    });
    xhr.addEventListener("loadend", () => {
        if (xhr.readyState === 4) {
            progress.remove();

            /** @type {string} */
            const url = URL.createObjectURL(xhr.response);

            const disposition = xhr.getResponseHeader("Content-Disposition");
            if (disposition == null) {
                alert("Missing Content-disposition header");
                return;
            }

            let filename = disposition.split(";", 2)[1];
            filename = filename.trim().split("=", 2)[1];

            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            a.click();
            a.remove();
        } else {
            console.log(xhr.readyState)
            return;
        }
    });
    xhr.send();
}
