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
    let elem = document.getElementById("form-select-file")
    elem.click();
    elem.addEventListener(
        "input",
        (event) => {
            let fragment = create_element(
                '<button id="upload" type="button" onclick="upload()">' +
                    'Upload<br>' + elem.files[0].name +
                '</button>');
            document.getElementById("select-file").replaceWith(fragment);
        });
}

function upload() {
    let fragment = create_element(
        '<div>' +
            '<progress id="progress"></progress>' +
        '</div>');
    let uploadButton = document.getElementById("upload");
    uploadButton.append(fragment);
    uploadButton.disabled = true;

    let progress = document.getElementById("progress");
    let xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/v1/upload");
    xhr.setRequestHeader("Content-Type", "multipart/form-data");
    xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
            progress.value = event.loaded / event.total;
        }
    });
    xhr.addEventListener("loadend", () => {
        if (xhr.readyState === 4) {
            progress.remove();
            fragment = create_element(
                '<button id="select-file" type="button" onclick="select_file()">' +
                    'Select File' +
                '</button>');
            uploadButton.replaceWith(fragment);
        } else {
            return;
        }
    });
    const formData = new FormData(document.getElementById("upload-form"));
    xhr.send(formData);
}

function download() {
    const fragment = create_element('<a id="download-link" href="/api/v1/download"></a>');
    document.body.appendChild(fragment);
    const e = document.getElementById("download-link");
    e.click();
    e.remove();
}
