import { LightningElement, track, wire } from "lwc";
import getbase64Data from "@salesforce/apex/PSPDFKitController.getbase64Data";
import getbase64DataForTemplate from "@salesforce/apex/PSPDFKitController.getbase64DataForTemplate";

import { ShowToastEvent } from "lightning/platformShowToastEvent";

import { api } from "lwc";
import {
  getRecord,
  getFieldValue,
  getRecordNotifyChange,
} from "lightning/uiRecordApi";
import getRecordFields from "@salesforce/apex/PSPDFKitController.getRecordFields";
import getRoleFields from "@salesforce/apex/PSPDFKitController.getRoleFields";
import PSPDFKit_TemplateJson__c from "@salesforce/schema/CMS_Case__c.PSPDFKit_TemplateJson__c";

import getDocumentTemplateJsonByDocumentId from "@salesforce/apex/PSPDFKitController.getDocumentTemplateJsonByDocumentId";
import getRecordValue from "@salesforce/apex/PSPDFKitController.getRecordValue";
import getRecordList from "@salesforce/apex/PSPDFKitController.getRecordList";
import getRelatedRecord from "@salesforce/apex/PSPDFKitController.getRelatedRecord";
import getRelatedLookupRecord from "@salesforce/apex/PSPDFKitController.getRelatedLookupRecord";
import resetDocumentSelection from "@salesforce/apex/PSPDFKitController.resetDocumentSelection";

import BD_Document_Selection__c from "@salesforce/schema/CMS_Case__c.BD_Document_Selection__c";

// Fetch the field holding the selected template
//const fields = [BD_Document_Selection__c];
export default class PSPDFKitGenerateDocument extends LightningElement {
  @api documentId;

  // Listen for when BD_Document_Selection__c
  // changes and reload PSPDFKit
  @wire(getRecord, {
    recordId: "$recordId",
    fields: [BD_Document_Selection__c],
    //layoutTypes: ["Full"],
    //modes: ["View"],
  })
  wiredRecord({ error, data }) {
    if (data) {
      this.record = data;
      console.log("logging data");
      console.log(data);
      const currentValue = getFieldValue(data, BD_Document_Selection__c); //aADOu0000008fPNOAY
      console.log(currentValue);
      this.documentId = currentValue;

      console.log(
        "reseting BD_Document_Selection__c for object " + this.objectApiName
      );

      // Reset BD_Document_Selection__c with a delay
      // otherwise PSPDFKit won't load
      window.setTimeout(() => {
        resetDocumentSelection({
          recordId: this.recordId,
          objectName: this.objectApiName,
        })
          .then(() => {
            console.log("BD_Document_Selection__c field reset to null");
          })
          .catch((error) => {
            x;
            console.error(
              "Error resetting BD_Document_Selection__c field: ",
              error
            );
          });
      }, 7000);
      // Call Apex method to reset the field

      console.log("Record Data: ", data); // Log the record data to inspect
      console.log("Object API Name: ", this.objectApiName); // Log the object API name
    } else if (error) {
      console.error("Error in wiredRecord: ", error);
    }
  }

  get objectApiName() {
    return this.record && this.record.apiName ? this.record.apiName : "";
  }

  // Use wire service to automatically call the Apex method when documentId is set
  placeholders;
  templateName;

  @wire(getDocumentTemplateJsonByDocumentId, { documentId: "$documentId" })
  wiredDocumentTemplateJson({ error, data }) {
    if (data) {
      console.log("Data received from Apex:", data);

      this.loadingData = true;

      try {
        // Directly access the fields from the SObject
        console.log("data");
        console.log(data);
        this.placeholders = JSON.parse(data.PSPDFKit_TemplateJson__c);
        this.templateName = data.Name;
        console.log("Placeholders:", this.placeholders);
        console.log("Template Name:", this.templateName);

        // Function to get the value for all placeholders in the JSON
        this.getAllRecordsNew();
      } catch (e) {
        this.readyToRender = true;
        this.loadingData = false;
        console.error(
          "Error processing template json, was the template properly imported?",
          e
        );
        alert("Error processing template json:", error);

        resetDocumentSelection({
          recordId: this.recordId,
          objectName: this.objectApiName,
        })
          .then(() => {
            console.log("BD_Document_Selection__c field reset to null");
          })
          .catch((error) => {
            x;
            console.error(
              "Error resetting BD_Document_Selection__c field: ",
              error
            );
          });
      }
    } else if (error) {
      this.readyToRender = true;
      this.loadingData = false;
      //alert("Error retrieving document template:", error);
      console.error("Error retrieving document template:", error);
    }
  }

  fileContents;
  @track fileName;
  @track openModalGenerate = false;
  @api recordId;
  @track record;
  /*@track dropdownOptions = [
    { label: "Role 1", value: "option1" },
    { label: "Role 2", value: "option2" },
    // You can add more options here
  ];

  updateDropdownOptions(newOptions) {
    this.dropdownOptions = [...newOptions];
  }*/

  /*@wire(getRecord, {
    recordId: "$recordId",
    fields: [PSPDFKit_TemplateJson__c],
  })
  wiredRecord({ error, data }) {
    if (error) {
      // Handle error
      console.error("Error fetching record:", error);
    } else if (data) {
      // Parse the JSON string from the record
      console.log("fetched data from Salesforce");
      console.log(data);
      const jsonString = data.fields.PSPDFKit_TemplateJson__c.value;

      this.templateData = jsonString ? JSON.parse(jsonString) : {};
    }
  }*/

  /*@wire(getRecord, {
    recordId: "$recordId",
    layoutTypes: ["Full"],
    modes: ["View"],
  })
  wiredRecord({ error, data }) {
    if (data) {
      this.record = data;
      console.log("Record Data: ", data); // Log the record data to inspect
      console.log("Object API Name: ", this.objectApiName); // Log the object API name
    } else if (error) {
      console.error("Error in wiredRecord: ", error);
    }
  }
  get objectApiName() {
    return this.record && this.record.apiName ? this.record.apiName : "";
  }*/

  @track placeholdersGenerated = [];

  @track placeholdersWithDropdownOptions = [
    {
      key: "key",
      value: "Test",
      searchTerm: "",
    },
  ];

  connectedCallback() {
    // Add event listener for the message event
    //window.addEventListener("message", this.handleMessageFromVf.bind(this));
  }

  disconnectedCallback() {
    // Remove event listener to avoid memory leaks
    window.removeEventListener("message", this.handleMessageFromVf.bind(this));
  }

  handleMessageFromVf(event) {
    // Check the message origin and type for security
    console.log("message received in Generate");

    // Assuming the message contains a JSON object under event.data
    const messageData = event.data;
    const data = JSON.parse(JSON.stringify(messageData));

    // searchKey should be the one saved in Salesforce
    // in PSPDFKit_TemplateJson__c

    console.log(this.templateData);
    this.fileName = "test";
    const savedTemplateData = this.templateData[this.fileName];

    console.log(savedTemplateData);
    if (data && data.value) {
      this.placeholdersGenerated = Object.keys(data.value).map((key) => {
        const savedValue = savedTemplateData.find(
          (item) => item.placeholder === key
        );
        console.log(savedValue);
        return {
          key: key,
          value: "Test",
          searchTerm: savedValue ? savedValue.databaseField : "<undefined>", //saved value from Salesforce
        };
      });
    }
    console.log("new placeholder data");
    console.log(JSON.parse(JSON.stringify(this.placeholdersGenerated)));
  }

  handleInputChange(event) {
    console.log("handleInputChange");
    const key = event.target.dataset.key;
    const value = event.target.value;
    this.placeholdersGenerated = this.placeholdersGenerated.map((item) => {
      if (item.key === key) {
        return { ...item, value: value };
      }
      return item;
    });
  }

  handleSelection(event) {
    console.log("handleSelection");
  }

  handleSearchChangeGenerated(event) {
    console.log("handleSearchChange");
    /*const key = event.target.dataset.key;
    const searchKey = event.target.value;
    // Call the Apex search method
    search({ searchKey: searchKey })
      .then((results) => {
        // Process search results
        // Update the placeholders with the search results
      })
      .catch((error) => {
        // Handle the error
        console.error("Search error:", error);
      });
    this.placeholders = this.placeholders.map((item) => {
      if (item.key === key) {
        return { ...item, searchKey: searchKey };
      }
      return item;
    });*/
  }

  async handleFile(file) {
    console.log("file data:");
    console.log(file);
    if (file.dataTransfer) {
      this.file = file.dataTransfer.files[0];
      this.fileName = this.file.name;
    } else if (file.target) {
      this.file = file.target.files[0];
      this.fileName = this.file.name;
    }
    if (
      this.file.type != "application/pdf" &&
      this.file.type != "image/png" &&
      this.file.type != "image/jpg" &&
      this.file.type != "image/jpeg" &&
      this.file.type != "image/tiff" &&
      this.file.type != "image/tif"
    ) {
      const evt = new ShowToastEvent({
        title: "Error",
        message: "Only pdf, png, jpeg and tiff files are supported.",
        variant: "error",
      });
      this.dispatchEvent(evt);
    } else {
      let visualForce = this.template.querySelector("iframe");
      if (visualForce) {
        visualForce.contentWindow.postMessage(
          { versionData: this.file, fName: this.fileName, state: "local" },
          "*"
        );
        this.fileContents = null;
      }
    }
  }

  handleDragover(event) {
    event.stopPropagation();
    event.preventDefault();
  }
  handleDrop(event) {
    event.stopPropagation();
    event.preventDefault();
    this.handleFile(event);
  }
  handleClick() {
    var input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("multiple", false);
    input.setAttribute("accept", ".png, .jpg, .jpeg, .tiff, .tif, .pdf");
    input.style.display = "none";
    input.click();
    input.addEventListener("change", (file) => {
      this.handleFile(file);
    });
    var dropzone = this.template.querySelector("div[data-id=file]");
    dropzone.appendChild(input);
  }

  closeModal() {
    this.openModalGenerate = false;
  }

  handleOpenModalGenerate() {
    this.openModalGenerate = true;
  }

  collectSearchTerms() {
    const lookupElements = this.template.querySelectorAll("c-custom-look-up");
    lookupElements.forEach((element) => {
      // Access the @api getter from the child component
      const searchValue = element.currentSearchTerm;
      console.log(`Search Term: ${searchValue}`);
    });
  }

  async collectLookupValues() {
    // Step 1: Populate lookupResults with keys and searchKeys from the LWC elements
    const lookupElements = this.template.querySelectorAll("c-custom-look-up");
    const searchTerms = [];
    lookupElements.forEach((element) => {
      const searchValue = element.currentSearchTerm;
      const keyValue = element.getAttribute("data-key");
      console.log(keyValue);
      if (keyValue) {
        searchTerms.push({
          placeholder: keyValue,
          databaseField: searchValue,
          value: "",
        });
      }
    });

    console.log("lookupElements before filling elements");
    console.log(lookupElements);
    console.log("searchTerms");
    console.log(searchTerms);
    console.log(searchTerms.length);

    let databaseFieldsRecords = searchTerms
      .map((item) => item.databaseField)
      .filter((field) => field !== "");

    // Query roles seperately
    let databaseFieldsRoles = databaseFieldsRecords
      .filter((value) => value.includes("Role: "))
      .map((value) => value.replace("Role: ", "")); // Remove "Role: " from the value

    databaseFieldsRecords = databaseFieldsRecords.filter(
      (value) => !value.includes("Role: ")
    );

    console.log("query fields:");
    console.log(databaseFieldsRecords);
    console.log(databaseFieldsRoles);

    if (databaseFieldsRecords.length > 0) {
      try {
        console.log("looking up records now");
        // Step 2: Fetch field values for the collected searchTerms
        const result = await getRecordFields({
          objectApiName: this.objectApiName,
          recordId: this.recordId,
          fieldNames: databaseFieldsRecords,
        });

        console.log("record id");
        console.log(this.recordId);
        console.log("result of getRecordFields:", result);

        // Seperate this out into a seperate process later
        const resultRoles = await getRoleFields({
          objectApiName: "CMS_Role__c",
          recordId: this.recordId,
          fieldNames: databaseFieldsRoles,
        });
        console.log("result of getRoleFields:", resultRoles);

        // Step 3: Update lookupResults with the fetched values
        searchTerms.forEach((item) => {
          if (item.databaseField && result[item.databaseField] !== undefined) {
            item.value = result[item.databaseField];
          }
        });

        // Process updated lookupResults as needed
        console.log("Updated lookupResults:", searchTerms);

        const transformedArray = searchTerms.map((item) => ({
          key: item.placeholder, // Mapping placeholder to key
          value: item.value, // Keeping value as is
        }));

        console.log(transformedArray);

        return transformedArray;
      } catch (error) {
        console.error("Error fetching records:", error);
      }
    }
  }

  async collectLookupValuesToGenerate() {
    // Step 1: Populate lookupResults with keys and searchKeys from the LWC elements
    const lookupElements = this.template.querySelectorAll(
      "c-custom-look-up-generate"
    );
    const searchTerms = [];
    lookupElements.forEach((element) => {
      // Get the current search term (value associated with the lookup)
      const searchValue = element.currentSearchTerm; // Ensure this method or property exists and is accessible

      // Get the key (placeholder name) associated with this lookup
      const keyValue = element.getAttribute("data-key");
      console.log(`Key Value: ${keyValue}, Search Value: ${searchValue}`);

      // Check if searchValue contains "Role:" and process accordingly
      if (searchValue && searchValue.includes("Role:")) {
        // If it does contain "Role:", remove "Role: " from the searchValue
        const cleanedSearchValue = searchValue.replace("Role: ", "");
        searchTerms.push({
          placeholder: keyValue,
          databaseField: cleanedSearchValue, // Assuming you want the cleaned value
          tableName: "CMS_Role__c", // Assuming this is the correct table to use for role-based values
        });
      } else {
        // If it does not contain "Role:", use the original logic
        searchTerms.push({
          placeholder: keyValue,
          databaseField: searchValue,
          tableName: this.objectApiName, // Use the object API name from the component's property
        });
      }
    });

    console.log("search terms to be saved: ");
    console.log(searchTerms);

    return searchTerms;
  }

  findTemplatePlaceholder(placeholders, placeholderName) {
    const placeholderObj = placeholders.find(
      (element) => element.placeholder === placeholderName
    );
    return placeholderObj ? placeholderObj.templatePlaceholder : null;
  }

  @track loadingData = false;
  @track readyToRender = false;
  async loadPSPDFKit() {
    console.log("in loadPSPDFKit Generate button");

    //window.setTimeout(async () => {
    console.log(
      "this.placeholdersGenerated ",
      JSON.stringify(this.placeholdersGenerated)
    );
    //console.log(this.record);
    //let name = this.record.data.apiName;
    //console.log(name);

    console.log("manually fetching all input fields");

    const lookupElements = await this.template.querySelectorAll(
      "c-custom-look-up-generate"
    );

    let filledPlaceholdersData = {};

    console.log("do lookup elements exist? ", lookupElements);

    //console.log(JSON.stringify(lookupElements));

    await lookupElements.forEach((element) => {
      // Access the @api getter from the child component
      //console.log(element);
      //const searchValue = element.currentSearchTerm;
      //console.log(`Search Term: ${searchValue}`);

      console.log("finding template placeholder");
      console.log(this.placeholdersGenerated);
      console.log(element.placeholderName);
      const templatePlaceholderString = this.findTemplatePlaceholder(
        this.placeholdersGenerated,
        element.placeholderName
      );

      console.log("element");
      console.log(JSON.stringify(element));
      //console.log(element.childrenInput);
      //console.log(element.childrenInputApi);
      if (element.childrenInputApi) {
        // Add parent first
        let placeholderName = templatePlaceholderString;
        let selectedRole = element.selectedRole;
        filledPlaceholdersData[placeholderName] = selectedRole;

        for (let i = 0; i < element.childrenInputApi.length; i++) {
          //console.log(element.childrenInputApi[i]);

          if (element.childrenInputApi[i].label !== "templatePlaceholder") {
            console.log(element.childrenInputApi[i]);
            //element.childrenInputApi[i].templatePlaceholder =
            filledPlaceholdersData[
              element.childrenInputApi[i].templatePlaceholder
            ] = element.childrenInputApi[i].value;
          }
        }
      } else {
        console.log(element.placeholderName);
        console.log(templatePlaceholderString);

        // Search for element.placeholderName in this.placeholdersGenerated
        // and fetch the templatePlacholder from there.

        let placeholderName = templatePlaceholderString;
        let placeholderValue = element.searchKey;
        let selectedRole = element.selectedRole;

        console.log(
          "Adding regular value for " +
            placeholderName +
            " selectedRole: " +
            selectedRole +
            " placeholderValue: " +
            placeholderValue
        );

        if (element.selectedRole) {
          filledPlaceholdersData[placeholderName] = selectedRole;
        } else {
          filledPlaceholdersData[placeholderName] = placeholderValue;
        }
      }
    });
    console.log(
      "final placeholder data, ",
      JSON.stringify(filledPlaceholdersData)
    );
    console.log(JSON.parse(JSON.stringify(filledPlaceholdersData)));

    // Fetch all placeholders AND their data
    // and send it to the VisualForce page
    // let event = this.event;
    //console.log(event);
    console.log("opening visual force page now");

    console.log("in timeout now");
    let visualForce = await this.template.querySelector("iframe");
    console.log(this.documentId);
    console.log(visualForce);
    console.log(visualForce && this.documentId);
    if (visualForce && this.documentId) {
      getbase64DataForTemplate({ documentTemplateId: this.documentId })
        .then((result) => {
          console.log("got result from getbase64DataForTemplate");
          console.log(result);

          getbase64Data({ strId: result }).then((result) => {
            var base64str = result.VersionData;
            var binary = atob(base64str.replace(/\s/g, ""));
            var len = binary.length;
            var buffer = new ArrayBuffer(len);
            var view = new Uint8Array(buffer);
            for (var i = 0; i < len; i++) {
              view[i] = binary.charCodeAt(i);
            }
            var blob = new Blob([view]);
            visualForce.contentWindow.postMessage(
              {
                versionData: blob,
                ContentDocumentId: result.ContentDocumentId,
                PathOnClient: result.PathOnClient,
                state: "salesforce",
                placeholders: filledPlaceholdersData,
                template: false,
                caseId: this.recordId,
                templateName: this.templateName,
              },
              "*"
            );
          });
        })
        .catch((error) => {
          console.log(error);
        });
      this.openModalGenerate = false;
    }
    //}, 5000);
  }

  async getAllRecords() {
    /*const lookupElements = this.template.querySelectorAll(
      "c-custom-look-up-generate"
    );*/
    console.log("getting roles based on saved placeholdersGenerated");
    console.log(this.placeholdersGenerated);

    const databaseFields = this.placeholdersGenerated
      .map((item) => item.searchTerm)
      .filter((field) => field !== "");

    // Separate fields related to roles and other fields
    let roleFields = databaseFields
      .filter((value) => value.includes("Role: "))
      .map((value) => value.replace("Role: ", ""));
    let recordFields = databaseFields.filter(
      (value) => !value.includes("Role: ")
    );

    console.log("Fields for querying databaseFields:", databaseFields);
    console.log("Fields for querying records:", recordFields);
    console.log("Fields for querying roles:", roleFields);

    if (recordFields.length > 0) {
      try {
        console.log("Looking up record fields...");
        const recordsResult = await getRecordFields({
          objectApiName: this.objectApiName,
          recordId: this.recordId,
          fieldNames: recordFields,
        });
        console.log("Result for record fields:", recordsResult);

        // Assuming you want to fetch roles if there are any role fields to query
        if (roleFields.length > 0) {
          const rolesResult = await getRoleFields({
            objectApiName: "CMS_Role__c", // Adjust if necessary
            recordId: this.recordId,
            fieldNames: roleFields,
          });
          console.log("Result for role fields:", rolesResult);

          const roleMapping = rolesResult.reduce((acc, role) => {
            const [fieldKey, fieldValue] = Object.entries(role)[0];
            acc[fieldKey] = fieldValue; // Map database field to role value
            return acc;
          }, {});
          console.log("mapping in roleMapping");
          console.log(roleMapping);

          this.placeholdersWithDropdownOptions = this.placeholdersGenerated.map(
            (placeholder) => {
              // Check if placeholder's searchTerm matches any key in the roleMapping
              const roleValue =
                roleMapping[placeholder.searchTerm.replace("Role: ", "")];
              return {
                ...placeholder,
                dropdownOptions: roleValue
                  ? [{ label: roleValue, value: roleValue }]
                  : [],
              };
            }
          );
          console.log("placeholdersWithDropdownOptions1");
          console.log(
            JSON.parse(JSON.stringify(this.placeholdersWithDropdownOptions))
          );

          this.placeholdersWithDropdownOptions =
            this.placeholdersWithDropdownOptions.map((placeholder) => {
              // Check if searchTerm starts with "Role: ". If it does, return the placeholder unchanged.
              if (placeholder.searchTerm.startsWith("Role: ")) {
                return placeholder;
              }

              // For other searchTerms, attempt to update the value based on recordFields.
              const searchTerm = placeholder.searchTerm; // No need to replace "Role: " here due to the check above.

              // If there's a matching key in recordsResult, update the value.
              if (recordsResult.hasOwnProperty(searchTerm)) {
                return { ...placeholder, value: recordsResult[searchTerm] };
              }

              // If no matching key is found, return the placeholder unchanged.
              return placeholder;
            });
          console.log("placeholdersWithDropdownOptions2");
          console.log(
            JSON.parse(JSON.stringify(this.placeholdersWithDropdownOptions))
          );

          // Update the dropdown options
          //this.updateDropdownOptions(newDropdownOptions);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        // Handle the error appropriately
      }
    }
  }

  async getLookUpValue(placeholder, databaseField, tableName) {
    // Is it a regular field
    // TODO

    // Is it a regular lookup field
    console.log("...condition, found a lookup field: " + databaseField);
    console.log("...condition, in table: " + tableName);
    let relationshipReferenceField;
    let relationshipField;
    [relationshipReferenceField, relationshipField] = databaseField.split(".");

    console.log(
      "...condition, relationshipReferenceField:  " + relationshipReferenceField
    );
    console.log("...condition, relationshipField:  " + relationshipField);
    try {
      const value = await getRelatedRecord({
        recordId: this.recordId,
        tableName,
        relationshipReferenceField,
        relationshipField,
      });

      return value;
    } catch (error) {
      console.error(
        `Error fetching condition value for ${placeholder}:`,
        error
      );
      return null;
    }
  }

  evaluateCondition(leftOperand, operator, rightOperand) {
    switch (operator) {
      case "==":
        return leftOperand == rightOperand;
      case "!=":
      case "=!":
        return leftOperand != rightOperand;
      case "<":
        return leftOperand < rightOperand;
      case "<=":
        return leftOperand <= rightOperand;
      case ">":
        return leftOperand > rightOperand;
      case ">=":
        return leftOperand >= rightOperand;
      default:
        throw new Error("Invalid operator");
    }
  }

  async getAllRecordsNew() {
    const results = [];
    let structuredData = [];

    console.log("getAllRecordsNew");
    console.log(this.placeholders);

    for (const {
      databaseField,
      placeholder,
      selectAtGenerate,
      tableName,
      referenceField,
      isCondition,
      leftOperand,
      rightOperand,
      operator,
    } of this.placeholders) {
      //console.log("in the loop");
      //console.log(databaseField + " " + placeholder);

      if (isCondition) {
        // if left value is not static, get it's value
        let leftValue;
        if (leftOperand.tableName !== leftOperand.databaseField) {
          leftValue = await this.getLookUpValue(
            leftOperand.placeholder,
            leftOperand.databaseField,
            leftOperand.tableName
          );
        } else {
          leftValue = leftOperand.databaseField;
        }

        // if right value is not static, get it's value
        let rightValue;
        if (rightOperand.tableName !== rightOperand.databaseField) {
          //console.log("...getting right lookup value");
          rightValue = await this.getLookUpValue(
            rightOperand.placeholder,
            rightOperand.databaseField,
            rightOperand.tableName
          );
          rightValue = returnObject.value;
        } else {
          rightValue = rightOperand.databaseField;
        }

        let result = this.evaluateCondition(leftValue, operator, rightValue);

        // evaluate
        console.log(
          `...got both values: ${leftValue}${operator}${rightValue} -> ${result}`
        );
        console.log(`...replacing: ${placeholder}`);

        results.push({
          placeholder: placeholder,
          value: result,
          isDropdown: false,
          templatePlaceholder: placeholder,
        });

        // set condition to true or false
      } else {
        // Reconstruct the displayname + placeholder if necessary
        let templatePlaceholder = "";
        if (
          placeholder !==
          tableName + "." + databaseField /*&&
        !placeholder.includes(".")*/
        ) {
          templatePlaceholder =
            placeholder + "+" + tableName + "." + databaseField;
        } else {
          templatePlaceholder = placeholder;
        }

        console.log(
          `reconstructing placeholders, placeholder: ${placeholder}, rest: ${tableName}.${databaseField}, referenceField: ${referenceField}, templatePlaceholder: ${templatePlaceholder}`
        );

        // Static Date field
        if (databaseField.includes("DATE")) {
          //console.log("+++++ in date field");
          const currentDate = new Date();
          const options = {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          };
          const formattedDate = currentDate.toLocaleDateString(
            "en-US",
            options
          );
          results.push({
            placeholder: "Date",
            value: formattedDate,
            isDropdown: false,
            //templatePlaceholder: templatePlaceholder,
            templatePlaceholder: "DATE",
          });
        }
        // It's a lookup field without relation
        else if (databaseField.includes(".") && selectAtGenerate === false) {
          //console.log("found a lookup field: " + databaseField);
          //console.log("in table: " + tableName);
          let relationshipReferenceField;
          let relationshipField;
          [relationshipReferenceField, relationshipField] =
            databaseField.split(".");

          //console.log(
          //  "relationshipReferenceField:  " + relationshipReferenceField
          //);
          //console.log("relationshipField:  " + relationshipField);
          try {
            const value = await getRelatedRecord({
              recordId: this.recordId,
              tableName,
              relationshipReferenceField,
              relationshipField,
            });

            results.push({
              placeholder,
              value,
              isDropdown: false,
              templatePlaceholder: templatePlaceholder,
            });
          } catch (error) {
            console.error(`Error fetching value for ${placeholder}:`, error);
            results.push({
              placeholder,
              value: "No value found",
              error: `Error fetching data: ${error.message}`,
              isDropdown: false,
              templatePlaceholder: templatePlaceholder,
            });
          }
        }
        // It's a related object
        else if (selectAtGenerate === true) {
          // Fetch list of possible values for dropdown
          /*console.log("----- in dropdown field");
          console.log(tableName);
          console.log(databaseField);
          console.log(this.recordId);
          console.log(placeholder);*/
          let recordId = await this.recordId;

          if (placeholder.includes(".")) {
            //console.log("child element found");

            // It's a child record, extract the parent name
            let parentName = placeholder.split(".")[0];
            let parent = structuredData.find((p) => p.name === parentName);
            if (!parent) {
              // If parent does not exist, create it and add it to the array
              parent = {
                name: parentName,
                children: [],
                databaseField: null,
                placeholder: parentName,
                selectAtGenerate: true,
                tableName: null,
                recordId: this.recordId,
                referenceField: referenceField,
              };
              structuredData.push(parent);
            } else {
            }
            if (!parent.children) {
              parent.children = [];
            }

            // Add the child field to the parent's children array
            parent.children.push({
              databaseField,
              placeholder,
              selectAtGenerate,
              tableName,
              templatePlaceholder,
              referenceField,
            });
          } else {
            //console.log("Parent value found, look for children values");

            // Push parent to structured data
            // so that children data can be
            // fetched later.
            let parent = structuredData.find((p) => p.name === placeholder);
            if (!parent) {
              structuredData.push({
                name: placeholder,
                children: [],
                databaseField,
                placeholder,
                selectAtGenerate,
                tableName,
                recordId,
                referenceField,
              });
            } else if (parent && parent.databaseField === null) {
              parent.databaseField = databaseField;
              parent.placeholder = placeholder;
              parent.selectAtGenerate = selectAtGenerate;
              parent.tableName = tableName;
              parent.recordId = this.recordId;
              parent.referenceField = referenceField;
            }

            // Related Record with Lookup
            if (databaseField.includes(".")) {
              //console.log("--------------------Related Field with Lookup");
              //console.log(this.recordId);

              let relationshipReferenceField;
              let relationshipField;
              [relationshipReferenceField, relationshipField] =
                databaseField.split(".");

              /*console.log(
                "relationshipReferenceField:  " + relationshipReferenceField
              );
              console.log("relationshipField:  " + relationshipField);
              console.log("sending referenceField: " + referenceField);*/

              try {
                const dropdownValues = await getRelatedLookupRecord({
                  parentId: this.recordId,
                  childId: "",
                  tableName,
                  relationshipReferenceField,
                  relationshipField,
                  referenceField: referenceField,
                });

                /*console.log("results from dropdown");
                console.log(dropdownValues);
                console.log(
                  "results from dropdown 2 " + JSON.stringify(dropdownValues)
                );*/

                results.push({
                  placeholder,
                  values: dropdownValues,
                  isDropdown: true,
                  templatePlaceholder: templatePlaceholder,
                  recordId: this.recordId,
                });
              } catch (error) {
                console.error(
                  `Error fetching value for ${placeholder}:`,
                  error
                );
                results.push({
                  placeholder,
                  value: "No value found",
                  error: `Error fetching data: ${error.message}`,
                  isDropdown: false,
                  templatePlaceholder: templatePlaceholder,
                });
              }
            }
            // Regular Field with Lookup
            else {
              //console.log("Regular Field with Lookup");

              try {
                const dropdownValues = await getRecordList({
                  tableName,
                  databaseField,
                  recordId,
                  referenceField,
                });

                //console.log("result for dropdwown parent received");
                //console.log(dropdownValues);

                const stringValues = dropdownValues.map((item) => item.value);
                //console.log("------ stringValues:");
                //console.log(stringValues);

                results.push({
                  placeholder,
                  values: stringValues,
                  isDropdown: true,
                  templatePlaceholder: templatePlaceholder,
                  recordId: this.recordId,
                });
              } catch (error) {
                console.error(
                  `Error fetching dropdown values for placeholder:`,
                  error
                );
                results.push({
                  placeholder,
                  values: ["No values found"],
                  error: `Error fetching data: ${error.message}`,
                  isDropdown: false,
                  templatePlaceholder: templatePlaceholder,
                });
              }
            }
          }
        }
        // It's regular field
        else {
          //console.log("----- in regular field");
          //console.log(databaseField);
          try {
            const value = await getRecordValue({
              tableName,
              fieldName: databaseField,
              recordId: this.recordId,
            });

            let valueString = value ? value.toString() : "";

            results.push({
              placeholder,
              value: valueString,
              isDropdown: false,
              templatePlaceholder: templatePlaceholder,
            });
          } catch (error) {
            console.error(`Error fetching value for ${placeholder}:`, error);
            results.push({
              placeholder,
              value: "No value found",
              error: `Error fetching data: ${error.message}`,
              isDropdown: false,
              templatePlaceholder: templatePlaceholder,
            });
          }
        }
      }
    }

    console.log("structured data");
    console.log(structuredData);
    // Now fetch all dropdown values for parents and
    // get the values for all of their children

    let addressData = [];
    let i = 0;
    await structuredData.forEach(async (parent) => {
      console.log("Parent:", parent.name);

      // Fetch parent values
      // TODO: Parent can be a lookup too
      // Call the function with the parent object
      try {
        const dropdownValues = await getRecordList({
          tableName: parent.tableName,
          databaseField: parent.databaseField,
          recordId: parent.recordId,
          referenceField: parent.referenceField,
        });

        console.log("----------result for parent dropdown received");
        console.log(dropdownValues);

        // Ensure results array is accessible and modifiable across multiple async calls
        //let results = [];

        // Loop through each item in dropdownValues
        dropdownValues.forEach(async (dropdownItem) => {
          //for (let dropdownItem of dropdownValues) {
          //console.log("Processing dropdownItem");
          //console.log(dropdownItem);

          // Loop through all children and process each
          for (let child of parent.children) {
            //console.log("  Child:", child);

            let [relationshipReferenceField, relationshipField] =
              child.databaseField.split(".");

            /*console.log(
              "relationshipReferenceField: " +
                relationshipReferenceField +
                " relationshipField: " +
                relationshipField +
                " recordId: " +
                this.recordId +
                " parentId: " +
                dropdownItem.Id +
                " referenceFieldFinal: " +
                parent.referenceField
            );*/

            // If child is regular object
            if (
              relationshipField === undefined &&
              relationshipReferenceField !== undefined
            ) {
              //console.log("child is regular object");
              let fieldName = relationshipReferenceField;

              const value = await getRecordValue({
                tableName: child.tableName,
                fieldName: fieldName,
                recordId: dropdownItem.Id, // parentId
              });

              let valueString = value ? value.toString() : "";

              addressData.push({
                placeholder: child.placeholder,
                value: valueString,
                isDropdown: false,
                parentId: dropdownItem.Id,
                parentValue: dropdownItem.value,
                templatePlaceholder:
                  child.placeholder +
                  "+" +
                  child.tableName +
                  "." +
                  child.databaseField,
                //recordId: dropdownItem.Id,
              });
            }
            // If child is Lookup object
            else if (
              relationshipField !== undefined &&
              relationshipReferenceField !== undefined
            ) {
              //console.log("++++++++++++++++++++ child is lookup object");

              let childDropdownValues;
              try {
                //if (referenceField !== ""){}
                //let referenceField = "BD_Case__c";
                //console.log("sending in: " + parent.referenceField);

                if (parent.referenceField) {
                  childDropdownValues = await getRelatedLookupRecord({
                    //recordId: this.recordId,
                    childId: dropdownItem.Id, // Use Id from dropdownValues for each child
                    parentId: parent.recordId,
                    tableName: child.tableName,
                    relationshipReferenceField: relationshipReferenceField,
                    relationshipField: relationshipField,
                    referenceField: parent.referenceField,
                  });
                } else {
                  childDropdownValues = await getRelatedLookupRecord({
                    //recordId: this.recordId,
                    childId: dropdownItem.Id, // Use Id from dropdownValues for each child
                    parentId: "",
                    tableName: child.tableName,
                    relationshipReferenceField: relationshipReferenceField,
                    relationshipField: relationshipField,
                    referenceField: parent.referenceField,
                  });
                }

                /*console.log(
                  "results from children dropdown ",
                  childDropdownValues
                );*/
                //console.log(childDropdownValues);

                // Find parent in results and add data to it

                /*console.log(
                  "templatePlaceholder: " + child.templatePlaceholder
                );*/

                // Push an input field to results
                let valueString = childDropdownValues[0]
                  ? childDropdownValues[0].toString()
                  : "";

                addressData.push({
                  placeholder: child.placeholder,
                  value: valueString,
                  isDropdown: false,
                  parentId: dropdownItem.Id,
                  parentValue: dropdownItem.value,
                  templatePlaceholder: child.templatePlaceholder,
                });
                /*results.push({
                  placeholder: parent.placeholder,
                  values: childDropdownValues,
                  isDropdown: true,
                  recordId: dropdownItem.Id, // Use Id for better tracking/association
                });*/
              } catch (error) {
                console.error(
                  `Error fetching value for ${child.placeholder}:` +
                    error +
                    " " +
                    JSON.stringify(childDropdownValues)
                );
                /*results.push({
                  placeholder: parent.placeholder,
                  value: "No value found",
                  error: `Error fetching data: ${error.message}`,
                  isDropdown: false,
                  recordId: dropdownItem.Id,
                });*/
              }
            } else {
              console.log("Error retrieving child data.");
            }
          }
          //console.log("final address data ");
          //console.log(addressData);

          //console.log("results until now, fixing it");
          this.placeholdersGenerated.forEach((item) => {
            if (item.isDropdown) {
              // Map over each object in the `values` array and join the characters into complete strings
              item.values = item.values.map((charObject) => {
                return Object.values(charObject).join("");
              });
            }
          });
          //console.log(this.placeholdersGenerated);

          // Loop over `placeholdersGenerated` to find dropdown items
          //for (let dropdownItem of this.placeholdersGenerated) {
          this.placeholdersGenerated.forEach((dropdownItem) => {
            //console.log("this is the dropdownItem");
            //console.log(JSON.parse(JSON.stringify(dropdownItem)));
            if (dropdownItem.isDropdown) {
              // Replace `values` array with a new mutable copy
              dropdownItem.values = dropdownItem.values.map((value) => {
                // Create a new copy of each value object
                let mutableValueEntry = { value };
                //let mutableValueEntry = valueEntry;

                //console.log("+++++++ mutableValueEntry");
                //console.log(mutableValueEntry);

                /*const combinedString =
                  Object.values(mutableValueEntry).join("");
                mutableValueEntry.value = combinedString;*/

                // Check the `addressData` array to find entries matching `parentValue`
                for (let addressEntry of addressData) {
                  //console.log("...for loop");
                  //console.log(addressEntry);
                  //console.log(JSON.stringify(addressEntry));
                  if (
                    mutableValueEntry.value === addressEntry.parentValue &&
                    addressEntry.placeholder.includes(
                      dropdownItem.placeholder
                    ) &&
                    addressEntry.placeholder != null
                    //&& addressEntry.value !== null
                    //addressEntry.placeholder != null
                  ) {
                    // Ensure 'Children' array exists
                    if (!dropdownItem["Children"]) {
                      dropdownItem["Children"] = [];
                    }

                    // Attempt to find the object in the 'Children' array where the key matches 'addressEntry.parentValue'
                    let childEntry = dropdownItem["Children"].find((child) =>
                      child.hasOwnProperty(addressEntry.parentValue)
                    );

                    // If no entry exists, create one
                    if (!childEntry) {
                      childEntry = {
                        [addressEntry.parentValue]: [],
                      };
                      dropdownItem["Children"].push(childEntry);
                    }

                    // Prepare new entry object
                    const newEntry = {
                      [addressEntry.placeholder]:
                        addressEntry.value !== null ? addressEntry.value : "", // Assign an empty string if value is null
                      templatePlaceholder: addressEntry.templatePlaceholder,
                    };
                    // Check if the entry already exists to prevent duplicates
                    let entryExists = childEntry[addressEntry.parentValue].some(
                      (entry) =>
                        entry[addressEntry.placeholder] === addressEntry.value
                    );

                    // Only add the new entry if it does not already exist
                    if (!entryExists) {
                      childEntry[addressEntry.parentValue].push(newEntry);
                    }

                    // Optional log to confirm assignment
                    /*console.log(
                      `Added placeholder "${addressEntry.placeholder}" with value "${addressEntry.value}" to dropdown item.`
                    );*/

                    //console.log(mutableValueEntry);
                  }
                }

                // Return the updated mutable object to replace the original
                return value;
              });
            }
          });

          /*console.log("modified within this.placeholdersGenerated");
          // Log the results to verify the changes
          console.log(JSON.parse(JSON.stringify(this.placeholdersGenerated)));
          console.log("fixing it now");
          this.placeholdersGenerated.forEach((item) => {
            if (item.isDropdown) {
              // Map over each object in the `values` array and join the characters into complete strings
              item.values = item.values.map((charObject) => {
                return Object.values(charObject).join("");
              });
            }
          });*/

          //return results;
          //}
        });
      } catch (error) {
        console.log("Could not fetch data for parent.");
        console.error("Error in processing data:", error);
        return []; // Return an empty array or suitable error handling
      }
    });
    // For every databaseField that's in structuredData.name

    // Fetch parent values

    // Once parent value is fetched, fetch all of their children values

    // Assign the results to placeholdersGenerated
    console.log("got results", results);
    console.log(results);
    this.placeholdersGenerated = results;

    // Add an extra option for the Headers before all results
    await this.placeholdersGenerated.unshift({
      placeholder: "Header",
      values: ["Yes", "No"],
      templatePlaceholder: "HEADER",
    });

    console.log("placeholdersGenerated", this.placeholdersGenerated);

    this.readyToRender = true;
    this.loadingData = false;

    window.setTimeout(() => {
      this.loadPSPDFKit();
    }, 1000);

    // Once the values have been fetched
    // load PSPDFKit

    return results;
  }

  async selectTemplateGenerate(event) {
    this.event = event;
    this.openModalGenerate = false;

    console.log("template for generation selected");

    // Also generate the first version of the document
    this.loadPSPDFKit();

    console.log(event);
    this.documentId = event.detail;
  }

  openVfPage(event) {
    let visualForce = this.template.querySelector("iframe");
    if (visualForce && event.detail) {
      getbase64Data({ strId: event.detail })
        .then((result) => {
          this.fileName = result.ContentDocumentId;
          var base64str = result.VersionData;
          var binary = atob(base64str.replace(/\s/g, ""));
          var len = binary.length;
          var buffer = new ArrayBuffer(len);
          var view = new Uint8Array(buffer);
          for (var i = 0; i < len; i++) {
            view[i] = binary.charCodeAt(i);
          }
          var blob = new Blob([view]);
          visualForce.contentWindow.postMessage(
            {
              versionData: blob,
              ContentDocumentId: result.ContentDocumentId,
              PathOnClient: result.PathOnClient,
              state: "salesforce",
              caseId: this.recordId,
            },
            "*"
          );
        })
        .catch((error) => {
          console.log(error);
        });
      this.openModalGenerate = false;
    }
  }
}
