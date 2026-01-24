{
    let elem = document.getElementById("form-select-file")
    elem.addEventListener(
        "input",
        (_) => {
            let filename = elem.files[0].name;
            filename = filename.length < 15 ? filename : filename.slice(0, 15) + '...';
            let fragment = create_element(
                '<button id="upload" type="button" onclick="upload()">' +
                    'Upload<br>' + filename +
                '</button>');
            document.getElementById("select-file").replaceWith(fragment);
        });
}

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
    document.getElementById("form-select-file").click();
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

function upload() {
    let uploadButton = document.getElementById("upload");
    uploadButton.append(upload_progress_fragment());
    uploadButton.disabled = true;

    let progress = document.getElementById("upload-progress");
    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/upload");
    xhr.setRequestHeader("Content-Type", "multipart/form-data");
    xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
            progress.value = event.loaded / event.total;
        }
    });
    xhr.addEventListener("loadend", (ev) => {
        if (xhr.readyState === 4) {
            progress.remove();
            uploadButton.replaceWith(select_file_fragment());
        } else {
            console.log(xhr.readyState)
            return;
        }
    });
    xhr.addEventListener("error", () => {
        alert("Upload failed");
        return;
    });
    const formData = new FormData(document.getElementById("upload-form"));
    xhr.send(formData);
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
