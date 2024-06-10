import { LightningElement, track, wire } from "lwc";
import getbase64Data from "@salesforce/apex/PSPDFKitController.getbase64Data";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

import DOCX_TEMPLATER from "@salesforce/resourceUrl/docxtemplater";
import INSPECT_MODULE from "@salesforce/resourceUrl/inspectModule";
import PIZZIP from "@salesforce/resourceUrl/pizzip";

import { api } from "lwc";
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import getRecordFields from "@salesforce/apex/PSPDFKitController.getRecordFields";
import getRoleFields from "@salesforce/apex/PSPDFKitController.getRoleFields";
import fetchAttachedDocumentFile from "@salesforce/apex/PSPDFKitController.fetchAttachedDocumentFile";
import getTemplateJson from "@salesforce/apex/PSPDFKitController.getTemplateJson";
import getAvailableObject from "@salesforce/apex/PSPDFKitController.getAvailableObject";
//import getRelatedObjectFields from "@salesforce/apex/PSPDFKitController.getRelatedObjectFields";
import getRelatedObjectFieldsString from "@salesforce/apex/PSPDFKitController.getRelatedObjectFieldsString";

//import getJunctionAndRoleFields from "@salesforce/apex/ObjectFieldRetriever.getJunctionAndRoleFields";

import { updateRecord } from "lightning/uiRecordApi";

export default class PSPDFKitFileSelector extends LightningElement {
  fileContents;
  @track fileName;
  @track openModal = false;
  @api recordId;

  @wire(getRecord, {
    recordId: "$recordId",
    layoutTypes: ["Full"],
    modes: ["View"],
  })
  record;

  get objectApiName() {
    return this.record.data ? this.record.data.apiName : "";
    //return this.record.data.apiName;
  }

  @track placeholders = [
    /*{
      key: "key",
      value: "Test",
      searchKey: "",
    },*/
  ];

  @track availableObject;

  @wire(getAvailableObject, { recordId: "$recordId" })
  wiredAvailableObject({ error, data }) {
    console.log("---got available object");
    console.log(data);
    if (data) {
      this.availableObject = data;
    } else if (error) {
      // handle error
      console.error("Error retrieving available object:", error);
    }
  }

  /*@track dropDownFields;
  @wire(getJunctionAndRoleFields, {})
  wiredAvailableObject({ error, data }) {
    if (data) {
      this.dropDownFields = data;
      //console.log("dropdown fields");
      //console.log(JSON.stringify(this.dropDownFields));
    } else if (error) {
      // handle error
      console.error("Error retrieving available object:", error);
    }
  }*/

  @track relatedObjects;
  @wire(getRelatedObjectFieldsString, {
    recordId: "$recordId",
    availableObject: "$availableObject",
  })
  wiredRelatedObject({ error, data }) {
    if (data) {
      console.log("related objects");
      this.relatedObjects = data;
      console.log(data);
      //console.log(JSON.stringify(this.relatedObjects));
      //this.dropDownFields = data;
    } else if (error) {
      // handle error
      console.error("Error retrieving related objects:", error);
    }
  }

  connectedCallback() {
    // Add event listener for the message event
    window.addEventListener("message", this.handleMessageFromVf.bind(this));
  }

  disconnectedCallback() {
    // Remove event listener to avoid memory leaks
    window.removeEventListener("message", this.handleMessageFromVf.bind(this));
  }

  handleMessageFromVf(event) {
    console.log("message received");

    const messageData = event.data;
    const data = JSON.parse(JSON.stringify(messageData));

    console.log(data);

    if (data && data.value) {
      function extractKeys(obj, parentKey = "") {
        const placeholders = [];

        console.log("Processing object:", obj);

        Object.keys(obj).forEach((key) => {
          const fullKey = parentKey ? `${parentKey}+${key}` : key;
          const parts = fullKey.split("+");

          console.log("Processing key:", key);
          console.log("Full key:", fullKey);
          console.log("Parts:", parts);

          if (
            typeof obj[key] === "object" &&
            !Array.isArray(obj[key]) &&
            obj[key] !== null
          ) {
            // This is the parent loop element
            if (Object.keys(obj[key]).length > 0) {
              // Recursively handle non-empty child objects
              console.log("Found non-empty nested object:", obj[key]);
              const children = extractKeys(obj[key], fullKey);
              const placeholder = {
                key: parts[0].trim(),
                value: "Enter filter criteria",
                //searchKey: parts.length > 1 ? parts[1].trim() : fullKey.trim(),
                searchKey: key.includes("Loop") ? "" : fullKey.trim(),
                children: children,
              };
              placeholders.push(placeholder);
            }
            // This is a regular placeholder or the child of a loop
            else {
              // Handle empty nested objects
              console.log("Found empty nested object:", fullKey);
              const placeholder = {
                //key: parts[0].trim(), key
                key: fullKey.includes("Loop") ? key : parts[0].trim(),
                //key: key,
                value: "Enter field name",
                searchKey: parts.length > 1 ? parts[1].trim() : fullKey.trim(),
                children: [],
                parentLoop: fullKey.includes("Loop") ? key : "",
              };

              placeholders.push(placeholder);
            }
          } else {
            const placeholder = {
              key: parts[0].trim(),
              value: "Filter",
              //searchKey: parts.length > 1 ? parts[1].trim() : fullKey.trim(),
              //searchKey: key.includes("Loop")
              //  ? "Enter filter criteria"
              //  : fullKey.trim(),
              searchKey: "Test",
              field: key.includes("Loop") ? "field" : undefined,
              filter: key.includes("Loop") ? "filter" : undefined,
              children: [],
            };
            placeholders.push(placeholder);
          }
        });

        return placeholders;
      }

      this.placeholders = extractKeys(data.value);
      console.log("placeholders set");
      console.log(this.placeholders);

      // Don't fetch JSON from Salesforce anymore, but
      // always load it from the document.
      // this.fetchAndProcessTemplateJson();
    } else {
      console.log("placeholders not set");
      console.log(data.value);
    }
  }

  fetchAndProcessTemplateJson() {
    getTemplateJson({ recordId: this.recordId })
      .then((result) => {
        // Parse the JSON string into an array
        const templateArray = JSON.parse(result);

        // Create a map for quick searchKey lookup by placeholder
        const searchKeyMap = new Map(
          templateArray.map((item) => [
            item.placeholder,
            item.databaseField
              ? item.tableName + ": " + item.databaseField
              : "",
          ])
        );

        // Now, go over the placeholders and fill in the searchKeys
        this.placeholders = this.placeholders.map((placeholder) => ({
          ...placeholder,
          searchKey: searchKeyMap.get(placeholder.key) || "",
        }));

        // If you need to trigger a re-render or notify the component of the change
        this.placeholders = [...this.placeholders];
      })
      .catch((error) => {
        console.error("Error fetching template JSON:", error);
      });
  }

  handleInputChange(event) {
    console.log("handleInputChange");
    const key = event.target.dataset.key;
    const value = event.target.value;
    this.placeholders = this.placeholders.map((item) => {
      if (item.key === key) {
        return { ...item, value: value };
      }
      return item;
    });
  }

  handleSelection(event) {
    console.log("handleSelection");
  }

  handleSearchChange(event) {
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
    console.log("in handle file");
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
    this.openModal = false;
  }

  handleOpenModal() {
    this.openModal = true;
  }

  collectSearchTerms() {
    const lookupElements = this.template.querySelectorAll("c-custom-look-up");
    lookupElements.forEach((element) => {
      // Access the @api getter from the child component
      const searchValue = element.currentSearchTerm;
      console.log(`Search Term: ${searchValue}`);
    });
  }

  async saveTemplate() {
    console.log("in save template button");

    // Collect all values from the template
    let valuesToSave = await this.collectLookupValuesToSave();
    console.log("the values to be saved");
    console.log(valuesToSave);
    console.log(this.record);

    /*this.fileName = "test";
    let templateObject = {
      [this.fileName]: valuesToSave,
    };*/

    // Save them to the hidden field in Salesforce
    let jsonString = JSON.stringify(valuesToSave);
    let recordInput = {
      fields: {
        Id: this.record.data.id,
        PSPDFKit_TemplateJson__c: jsonString,
      },
    };
    updateRecord(recordInput)
      .then(() => {
        // Handle success, such as showing a success message
        console.log("Record updated with JSON string");
        alert("Template Saved");
      })
      .catch((error) => {
        // Handle error, such as showing an error message
        console.error("Error updating record:", error);
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

  splitValuesIntoComponents(keyValue, searchValue, placeholder) {
    let parts;
    if (searchValue !== "") {
      parts = searchValue.split(".").map((part) => part.trim());
    } else {
      parts = placeholder.split(".").map((part) => part.trim());
    }

    let tableName;
    let databaseField;
    // Invalid format, fallback to the entire string
    // and select the correct value in the UI.
    if (parts.length < 2) {
      tableName = parts[0];
      databaseField = parts[0];
    } else {
      tableName = parts[0]; // Before the first '.'
      databaseField = parts.slice(1).join("."); // Join everything after the first '.'
    }

    let tableNameDifferent = this.availableObject !== tableName;

    // Check if the referenceField is given in related objects
    let referenceField = "";
    if (tableNameDifferent) {
      console.log("this.relatedObjects " + this.relatedObjects);

      let entries = this.relatedObjects.split(";");

      entries.forEach((entry) => {
        let baseValue;
        let parameter = null;

        // Check if the entry contains brackets
        let startIndex = entry.indexOf("[");
        let endIndex = entry.indexOf("]");

        if (startIndex !== -1 && endIndex !== -1) {
          // Extract the base value and the parameter
          baseValue = entry.substring(0, startIndex);
          parameter = entry.substring(startIndex + 1, endIndex);
        } else {
          // No brackets, the entire entry is the base value
          baseValue = entry;
        }

        //console.log("baseValue: " + baseValue);
        //console.log("Parameter: " + parameter);

        // Now compare baseValue with tableName
        if (baseValue === tableName) {
          console.log("Match found:", baseValue);
          if (parameter !== null) {
            console.log("Parameter:", parameter);
            referenceField = parameter;
          }
        }
      });
    }

    if (tableNameDifferent && referenceField !== "") {
      /*searchTerms.push({
        placeholder: keyValue,
        databaseField: databaseField,
        tableName: tableName,
        selectAtGenerate: tableNameDifferent,
        referenceField: referenceField,
      });*/
      return {
        placeholder: keyValue,
        databaseField: databaseField,
        tableName: tableName,
        selectAtGenerate: tableNameDifferent,
        referenceField: referenceField,
      };
    } else {
      /*searchTerms.push({
        placeholder: keyValue,
        databaseField: databaseField,
        tableName: tableName,
        selectAtGenerate: tableNameDifferent,
      });*/
      return {
        placeholder: keyValue,
        databaseField: databaseField,
        tableName: tableName,
        selectAtGenerate: tableNameDifferent,
      };
    }
  }

  parseCondition(databaseField) {
    const regex = /(==|!=|=!|<=|>=|<|>)/;
    const parts = databaseField.split(regex);
    if (parts.length !== 3) {
      throw new Error("Invalid condition format");
    }
    const [leftSide, operator, rightSide] = parts;
    return { leftSide, operator, rightSide };
  }

  async collectLookupValuesToSave() {
    // Step 1: Populate lookupResults with keys and searchKeys from the LWC elements
    const lookupElements = this.template.querySelectorAll("c-custom-look-up");
    const searchTerms = [];
    lookupElements.forEach((element) => {
      // Get the current search term (value associated with the lookup)
      const searchValue = element.currentSearchTerm; // Ensure this method or property exists and is accessible

      // Get the key (placeholder name) associated with this lookup
      const keyValue = element.getAttribute("data-key");
      const placeholder = element.currentSearchKey;
      const parentLoop = element.parentLoop;

      console.log(
        `Key Value: ${keyValue}, Search Value: ${searchValue}, Placeholder: ${placeholder}`
      );

      // If it's a condition, do someting here
      // TODO:
      if (keyValue.includes("Condition")) {
        console.log("...Condition found");

        let originalPlaceholder = "";
        let conditionParsed;
        if (searchValue !== "") {
          originalPlaceholder = keyValue + "+" + searchValue;
          conditionParsed = this.parseCondition(searchValue);
        } else {
          originalPlaceholder = keyValue + "+" + placeholder;
          conditionParsed = this.parseCondition(placeholder);
        }
        console.log("conditionParsed");
        console.log(conditionParsed);

        let leftSideObject = this.splitValuesIntoComponents(
          keyValue,
          "",
          conditionParsed.leftSide
        );
        let rightSideObject = this.splitValuesIntoComponents(
          keyValue,
          "",
          conditionParsed.rightSide
        );

        console.log("here are both sides parsed");
        console.log(leftSideObject);
        console.log(rightSideObject);

        let objectToPush = {
          isCondition: true,
          databaseField: null,
          placeholder: originalPlaceholder,
          selectAtGenerate: false,
          tableName: null,
          referenceField: null,
          leftOperand: leftSideObject,
          rightOperand: rightSideObject,
          operator: conditionParsed.operator,
        };

        searchTerms.push(objectToPush);
      } else if (parentLoop) {
        alert("child found");
      } else if (keyValue.includes("Loop")) {
        console.log("Loop found");
        console.log("has parent?");
        console.log(parentLoop);

        let objectToPush = {
          isLoop: true,
          databaseField: null,
          placeholder: keyValue,
          selectAtGenerate: false,
          tableName: null,
          referenceField: null,
          loopElements: {},
        };

        searchTerms.push(objectToPush);
      } else {
        // If the available object is the same
        // as the tableName, it's a regular field
        // otherwise it's a field that can have
        // multiple options and has to be selected
        // at the time of generating the document

        let objectToPush = this.splitValuesIntoComponents(
          keyValue,
          searchValue,
          placeholder
        );
        searchTerms.push(objectToPush);
      }
    });

    console.log("search terms to be saved: ");
    console.log(searchTerms);

    return searchTerms;
  }

  async loadPSPDFKit() {
    console.log("in loadPSPDFKit Generate button");
    console.log(this.record);
    let name = this.record.data.apiName;
    console.log(name);
    /*const lookupElements = this.template.querySelectorAll("c-custom-look-up");
    console.log(lookupElements);
    lookupElements.forEach((element) => {
      // Access the @api getter from the child component
      const searchValue = element.currentSearchTerm;
      console.log(`Search Term: ${searchValue}`);
    });*/

    // Roles come from CMS_Role__c
    let filledPlaceholdersData = await this.collectLookupValues();
    let valuesToSaveTemp = await this.collectLookupValuesToSave();
    console.log("the values to be saved");
    console.log(valuesToSaveTemp);

    let event = { detail: "069Ou000000l6I5IAI" };
    const placeholdersData = JSON.stringify(this.placeholders);
    console.log("Generating document with placeholders: ");
    console.log(filledPlaceholdersData);

    let visualForce = this.template.querySelector("iframe");
    if (visualForce && event.detail) {
      getbase64Data({ strId: event.detail })
        .then((result) => {
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
            },
            "*"
          );
        })
        .catch((error) => {
          console.log(error);
        });
      this.openModal = false;
    }
  }

  async loadTemplate() {
    if (!this.recordId) {
      console.error("No recordId found");
      return;
    }

    try {
      let documentData = await fetchAttachedDocumentFile({
        recordId: this.recordId,
      });

      // Check if the document has been retrieved
      if (documentData && documentData.VersionData) {
        var base64str = documentData.VersionData;
        var binary = atob(base64str.replace(/\s/g, ""));
        var len = binary.length;
        var buffer = new ArrayBuffer(len);
        var view = new Uint8Array(buffer);
        for (var i = 0; i < len; i++) {
          view[i] = binary.charCodeAt(i);
        }
        var blob = new Blob([view], { type: "application/pdf" }); // Set the correct MIME type

        let visualForce = this.template.querySelector("iframe");
        if (visualForce) {
          visualForce.contentWindow.postMessage(
            {
              versionData: blob,
              ContentDocumentId: documentData.ContentDocumentId,
              PathOnClient: documentData.PathOnClient,
              state: "salesforce",
              template: true,
            },
            "*" // Be cautious with using "*", it's better to specify the target origin if possible for security reasons
          );
        }
      } else {
        console.error("Document data is not available");
      }
    } catch (error) {
      console.error("Error loading template:", error);
    }
  }

  selectTemplate(event) {
    this.openModal = false;
    let visualForce = this.template.querySelector("iframe");
    if (visualForce && event.detail) {
      console.log("LWC: selected template ", event.detail);
      getbase64Data({ strId: event.detail })
        .then((result) => {
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
              template: true,
            },
            "*"
          );
        })
        .catch((error) => {
          console.log(error);
        });
      this.openModal = false;
    }
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
              template: true,
            },
            "*"
          );
        })
        .catch((error) => {
          console.log(error);
        });
      this.openModal = false;
    }
  }
}
