var recId = '{!fileDetail}';
var updatedFile;
var tempInstance = null;
var contVersion;
var state;
var pdf;
var baseUrl = `${window.location.protocol}//${window.location.host}{!$Resource.PSPDFKit_lib}/`;

const saveButton = {
    type: "custom",
    id: "download-pdf",
    title: "Save",
    onPress: () => {
        tempInstance.exportPDF().then((buffer) => {
            const blob = new Blob([buffer], { type: "application/pdf" });
            getBase64(blob).then((result) => {
                updatedFile = result;
                var Object = new sforce.SObject('contentVersion');
                if(state == 'salesforce'){
                    Object.ContentDocumentId = contVersion.ContentDocumentId;
                    Object.PathOnClient = contVersion.PathOnClient;
                    Object.VersionData = updatedFile;
                    var res = sforce.connection.create([Object]);
                    res[0].success === 'true' ? alert('File updated') : alert('File not updated');
                } else if(state == 'local'){
                    Object.Title = contVersion.fName;
                        Object.PathOnClient = contVersion.fName;
                        Object.VersionData = updatedFile;
                        Object.contentLocation = 'S';
                        var res = sforce.connection.create([Object]);
                        res[0].success === 'true' ? alert('File Saved Successfully') : alert('File not saved');
                    }
                    else if('{!contVersion}' != null) {
                        Object.ContentDocumentId ='{!contVersion.ContentDocumentId}';
                        Object.PathOnClient = '{!contVersion.PathOnClient}';
                        Object.VersionData = updatedFile;
                        var res = sforce.connection.create([Object]);
                        res[0].success === 'true' ? alert('File updated') : alert('File not updated');
                    }
            });
        });
    }
};

if(recId != null){
    pdf = '{!conbase}';
    if(pdf != ''){
        var base64str = pdf;
        var binary = atob(base64str.replace(/\s/g, ''));
        var len = binary.length;
        var buffer = new ArrayBuffer(len);
        var view = new Uint8Array(buffer);
        for (var i = 0; i < len; i++) {
            view[i] = binary.charCodeAt(i);
        }
        pdf = new Blob( [view]);
        loadPSPDFKit();
    }
}

window.addEventListener('message',handleOpenAndSaveFiles);

function handleOpenAndSaveFiles(event){
    state = event.data.state;
    contVersion = event.data;
    pdf = event.data.versionData;
    if(pdf != ''){
        if(tempInstance == null){
            loadPSPDFKit();
        }else{
            PSPDFKit.unload(tempInstance);
            loadPSPDFKit();
        }
    }
}

function loadPSPDFKit(){
    pdf.arrayBuffer().then(val => {
        PSPDFKit.load({
            baseUrl,
            container: "#pspdfkit",
            document: val,
            toolbarItems: PSPDFKit.defaultToolbarItems.concat([saveButton]),
            disableWebAssemblyStreaming: true,
        })
        .then(instance => {tempInstance = instance;})
        .catch(error => {console.log(error);});
    })
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            let result = reader.result;
            let base64 = 'base64,';
            let content = result.indexOf(base64) + base64.length;
            let fileContents = result.substring(content);
            resolve(fileContents);
        }
        reader.onerror = error => reject(error);
    });
}