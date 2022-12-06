import { LightningElement,track, wire } from 'lwc';
import getbase64Data from '@salesforce/apex/PSPDFKitController.getbase64Data';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class PSPDFKitFileSelector extends LightningElement {

    fileContents;
    @track fileName
    @track openModal = false;

    async handleFile(file)
    {
        if(file.dataTransfer) {
            this.file= file.dataTransfer.files[0];
            this.fileName = this.file.name;
        }
        else if(file.target) {
            this.file=file.target.files[0];
            this.fileName = this.file.name;
        }
        if(this.file.type != 'application/pdf' && this.file.type != 'image/png' && this.file.type != 'image/jpg' && this.file.type != 'image/jpeg' && this.file.type != 'image/tiff' && this.file.type != 'image/tif'){
            const evt = new ShowToastEvent({
                title: 'Error',
                message: 'Only pdf, png, jpeg and tiff files are supported.',
                variant: 'error',
            });
            this.dispatchEvent(evt);
        }
        else{
            let visualForce = this.template.querySelector("iframe");
            if( visualForce ){
                visualForce.contentWindow.postMessage({versionData : this.file, fName : this.fileName, fileType: this.file.type, state : 'local'}, '*');
                this.fileContents = null;
            }
        }
    }

    handleDragover(event)
    {
        event.stopPropagation();
        event.preventDefault();
    }
    handleDrop(event)
    {
        event.stopPropagation();
        event.preventDefault();
        this.handleFile(event);
    }
    handleClick()
    {
        var input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('multiple', false);
        input.setAttribute('accept', '.png, .jpg, .jpeg, .tiff, .tif, .pdf')
        input.style.display = 'none';
        input.click();
        input.addEventListener('change', file => {
            this.handleFile(file);
        });
        var dropzone = this.template.querySelector('div[data-id=file]');
        dropzone.appendChild(input);
    }

    closeModal(){
        this.openModal = false;
    }

    handleOpenModal(){
        this.openModal = true;
    }

    openVfPage(event){
        let visualForce = this.template.querySelector("iframe");
        if(visualForce && event.detail){
            getbase64Data({strId : event.detail})
            .then(result => {
                var base64str = result.VersionData;
                var binary = atob(base64str.replace(/\s/g, ''));
                var len = binary.length;
                var buffer = new ArrayBuffer(len);
                var view = new Uint8Array(buffer);
                for (var i = 0; i < len; i++) {
                    view[i] = binary.charCodeAt(i);
                }
                var blob = new Blob( [view]);
                visualForce.contentWindow.postMessage({versionData : blob, ContentDocumentId : result.ContentDocumentId, PathOnClient : result.PathOnClient, fileType : result.FileType, state : 'salesforce'}, '*');
            })
            .catch(error => {console.log(error)});
            this.openModal = false;
        }
    }
}