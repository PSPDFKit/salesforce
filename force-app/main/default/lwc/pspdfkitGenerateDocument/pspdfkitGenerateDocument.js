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

import BD_Document_Selection__c from "@salesforce/schema/CMS_Case__c.BD_Document_Selection__c";
export default class PSPDFKitGenerateDocument extends LightningElement {
  @api documentId;

  // Listen for when BD_Document_Selection__c
  // changes and reload PSPDFKit
  @wire(getRecord, {
    recordId: "$recordId",
    fields: [BD_Document_Selection__c],
  })
  wiredRecord({ error, data }) {
    console.log("in wiredRecord for BD_Document_Selection__c");
    const currentValue = getFieldValue(data, BD_Document_Selection__c);
    console.log(currentValue);
    this.documentId = currentValue;
  }

  // Use wire service to automatically call the Apex method when documentId is set
  @wire(getDocumentTemplateJsonByDocumentId, { documentId: "$documentId" })
  wiredDocumentTemplateJson({ error, data }) {
    console.log(data);
    if (data) {
      console.log("data before");
      console.log(data);
      this.placeholders = JSON.parse(data);

      console.log("Template JSON:", this.placeholders);

      // Function to get the value for all placeholders
      // in the JSON
      this.getAllRecordsNew();
    } else if (error) {
      console.error("Error retrieving document template JSON:", error);
    }
  }

  fileContents;
  @track fileName;
  @track openModalGenerate = false;
  @api recordId;
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

  async loadPSPDFKit() {
    console.log("in loadPSPDFKit Generate button");
    console.log(this.record);
    let name = this.record.data.apiName;
    console.log(name);

    console.log("manually fetching all input fields");

    const lookupElements = this.template.querySelectorAll(
      "c-custom-look-up-generate"
    );

    let filledPlaceholdersData = {};

    //console.log(JSON.stringify(lookupElements));

    lookupElements.forEach((element) => {
      // Access the @api getter from the child component
      //console.log(element);
      //const searchValue = element.currentSearchTerm;
      //console.log(`Search Term: ${searchValue}`);

      const templatePlaceholderString = this.findTemplatePlaceholder(
        this.placeholdersGenerated,
        element.placeholderName
      );

      console.log("element");
      //console.log(element);
      console.log(element.placeholderName);
      console.log(templatePlaceholderString);

      // Search for element.placeholderName in this.placeholdersGenerated
      // and fetch the templatePlacholder from there.

      let placeholderName = templatePlaceholderString;
      let placeholderValue = element.searchKey;
      let selectedRole = element.selectedRole;

      if (element.selectedRole) {
        filledPlaceholdersData[placeholderName] = selectedRole;
      } else {
        filledPlaceholdersData[placeholderName] = placeholderValue;
      }
    });
    console.log("final placeholder data");
    console.log(filledPlaceholdersData);

    // Fetch all placeholders AND their data
    // and send it to the VisualForce page
    // let event = this.event;
    //console.log(event);
    console.log("opening visual force page now");
    let visualForce = this.template.querySelector("iframe");
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

    /*const searchTerms = [];
    lookupElements.forEach((element) => {
      const searchValue = element.currentSearchTerm;
      const keyValue = element.getAttribute("data-key");
      console.log("getting role keys");
      console.log(keyValue);
      if (keyValue) {
        searchTerms.push({
          placeholder: keyValue,
          databaseField: searchValue,
          value: "",
        });
      }
    });*/

    /*console.log("lookupElements before filling elements");
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
        console.log("result of getRoleFields:", resultRoles);*/
  }

  async getAllRecordsNew() {
    const results = [];
    let structuredData = [];

    for (const {
      databaseField,
      placeholder,
      selectAtGenerate,
      tableName,
    } of this.placeholders) {
      console.log("reconstructing placeholders");
      console.log("placeholder: " + placeholder);
      console.log("rest: " + tableName + "." + databaseField);
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

      console.log("templatePlaceholder");
      console.log(templatePlaceholder);

      // Static Date field
      if (databaseField.includes("DATE")) {
        console.log("+++++ in date field");
        const currentDate = new Date();
        const options = {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        };
        const formattedDate = currentDate.toLocaleDateString("en-US", options);
        results.push({
          placeholder: "Date",
          value: formattedDate,
          isDropdown: false,
          templatePlaceholder: templatePlaceholder,
        });
      }
      // It's a lookup field
      else if (databaseField.includes(".") && selectAtGenerate === false) {
        console.log("found a lookup field: " + databaseField);
        console.log("in table: " + tableName);
        let relationshipReferenceField;
        let relationshipField;
        [relationshipReferenceField, relationshipField] =
          databaseField.split(".");

        console.log(
          "relationshipReferenceField:  " + relationshipReferenceField
        );
        console.log("relationshipField:  " + relationshipField);
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
      } else if (selectAtGenerate === true) {
        // Fetch list of possible values for dropdown
        console.log("----- in dropdown field");
        console.log(tableName);
        console.log(databaseField);
        console.log(this.recordId);
        let recordId = await this.recordId;

        if (placeholder.includes(".")) {
          console.log("child element found");

          // It's a child record, extract the parent name
          let parentName = placeholder.split(".")[0];
          let parent = structuredData.find((p) => p.name === parentName);
          if (!parent) {
            // If parent does not exist, create it and add it to the array
            parent = {
              name: parentName,
              children: [],
              databaseField: null,
              placeholder: null,
              selectAtGenerate: null,
              tableName: null,
              recordId: this.recordId,
            };
            structuredData.push(parent);
          } else {
          }
          // Add the child field to the parent's children array
          parent.children.push({
            databaseField,
            placeholder,
            selectAtGenerate,
            tableName,
          });
          /*
        
          let relationshipReferenceField;
          let relationshipField;
          [relationshipReferenceField, relationshipField] =
            databaseField.split(".");

          console.log(
            "relationshipReferenceField:  " + relationshipReferenceField
          );
          console.log("relationshipField:  " + relationshipField);

          try {
            const dropdownValues = await getRelatedLookupRecord({
              recordId: this.recordId,
              tableName,
              relationshipReferenceField,
              relationshipField,
            });

            console.log("results from dropdown");
            console.log(dropdownValues);

            results.push({
              placeholder,
              values: dropdownValues,
              isDropdown: true,
              templatePlaceholder: templatePlaceholder,
              recordId: this.recordId,
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
        */
        } else {
          console.log("Parent value found, look for children values");

          let parent = structuredData.some((p) => p.name === databaseField);
          if (!parent) {
            structuredData.push({
              name: placeholder,
              children: [],
              databaseField,
              placeholder,
              selectAtGenerate,
              tableName,
              recordId,
            });
          } else if (parent && parent.databaseField === null) {
            parent.databaseField = databaseField;
            parent.placeholder = placeholder;
            parent.selectAtGenerate = selectAtGenerate;
            parent.tableName = tableName;
            parent.recordId = this.recordId;
          }
          // handle this later
          // fetch values for parents
          /*
          try {
            const dropdownValues = await getRecordList({
              tableName,
              databaseField,
              recordId,
            });

            console.log("result for dropdwown received");
            console.log(dropdownValues);

            results.push({
              placeholder,
              values: dropdownValues,
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
              isDropdown: true,
              templatePlaceholder: templatePlaceholder,
            });
          }*/
        }
      }
      // It's regular field
      else {
        console.log("----- in regular field");
        console.log(databaseField);
        try {
          const value = await getRecordValue({
            tableName,
            fieldName: databaseField,
            recordId: this.recordId,
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
    }

    console.log("structured data");
    console.log(structuredData);
    // Now fetch all dropdown values for parents and
    // get the values for all of their children

    structuredData.forEach(async (parent) => {
      console.log("Parent:", parent.name);

      // Fetch parent values
      // TODO: Parent can be a lookup too
      try {
        const dropdownValues = await getRecordList({
          tableName: parent.tableName,
          databaseField: parent.databaseField,
          recordId: parent.recordId,
        });

        console.log("result for dropdown received");
        console.log(dropdownValues);

        parent.children.forEach(async (child) => {
          console.log("  Child:", child);

          let relationshipReferenceField;
          let relationshipField;
          [relationshipReferenceField, relationshipField] =
            child.databaseField.split(".");

          console.log(
            "relationshipReferenceField:  " + relationshipReferenceField
          );
          console.log("relationshipField:  " + relationshipField);

          // TODO: Child can be a regular element as well
          // not just lookup
          try {
            const dropdownValues = await getRelatedLookupRecord({
              recordId: parent.recordId,
              tableName: child.tableName,
              relationshipReferenceField,
              relationshipField,
            });

            console.log("results from children dropdown");
            console.log(dropdownValues);

            results.push({
              placeholder: parent.placeholder,
              values: dropdownValues,
              isDropdown: true,
              //templatePlaceholder: templatePlaceholder,
              recordId: parent.recordId,
            });
          } catch (error) {
            console.error(`Error fetching value for ${placeholder}:`, error);
            results.push({
              placeholder: parent.placeholder,
              value: "No value found",
              error: `Error fetching data: ${error.message}`,
              isDropdown: false,
              //templatePlaceholder: templatePlaceholder,
            });
          }
        });

        results.push({
          placeholder: parent.placeholder,
          values: dropdownValues,
          isDropdown: true,
          templatePlaceholder: templatePlaceholder,
          recordId: this.recordId,
        });
      } catch (error) {
        console.error(`Error fetching dropdown values for placeholder:`, error);
        results.push({
          placeholder: parent.placeholder,
          values: ["No values found"],
          error: `Error fetching data: ${error.message}`,
          isDropdown: true,
          templatePlaceholder: templatePlaceholder,
        });
      }
    });
    // For every databaseField that's in structuredData.name

    // Fetch parent values

    // Once parent value is fetched, fetch all of their children values

    console.log("Fetched data:", results);
    this.placeholdersGenerated = results;
    //console.log("these are the new placeholders generated:");
    //console.log(JSON.stringify(this.placeholdersGenerated));

    // Once the values have been fetched
    // load PSPDFKit
    this.loadPSPDFKit();

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
