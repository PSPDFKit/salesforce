import { LightningElement, wire, track } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getAttachmentDetails from '@salesforce/apex/PSPDFKitController.getAttachmentDetails';

export default class pspdfkitOnload extends LightningElement {
    @track recordId;

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
        if (currentPageReference) {
            this.recordId = currentPageReference.state.recordId;
            console.log('this.recordId',this.recordId);
        }
    }
  connectedCallback() {
    getAttachmentDetails({record_Id: this.recordId}).then(data=>{
        if(data && data.length > 0){
            var fileData    = data[0]
            this.dispatchEvent( new CustomEvent('pass',{detail: fileData}));
        }
    })
  }
}