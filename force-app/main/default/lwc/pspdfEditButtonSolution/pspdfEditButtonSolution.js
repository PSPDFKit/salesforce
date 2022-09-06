import { LightningElement, api, track } from 'lwc';
import Button_label from '@salesforce/label/c.Button_label';
export default class PspdfEditButtonSolution extends LightningElement {

    @api recordId;
    @api btnColor;
    @api newTab = false;
    @track newWindow
    @track btnLabel = Button_label;

    renderedCallback(){
        this.template.querySelector("button").style="background-color:"+this.btnColor;
    }

    openFileInNewTab(){ 
        if(this.newTab == true){
            this.newWindow = window.open('/apex/PSPDF_InitPspdf?id='+this.recordId,'_blank');
        }else{
            this.newWindow = window.open('/apex/PSPDF_InitPspdf?id='+this.recordId,'_self');
        }
        
    }
    

}