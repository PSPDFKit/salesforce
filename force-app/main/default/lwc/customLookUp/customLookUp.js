import { LightningElement, wire, track, api } from "lwc";
import searchRecords from "@salesforce/apex/lookUpClass.searchRecords";
import getObjectFields from "@salesforce/apex/ObjectFieldRetriever.getObjectFields";
import getJunctionAndRoleFields from "@salesforce/apex/ObjectFieldRetriever.getJunctionAndRoleFields";
import getRoleFields from "@salesforce/apex/PSPDFKitController.getRoleFields";

export default class CustomLookUp extends LightningElement {
  @track searchResults = [];
  @track searchTerm = "";
  @track selectedValueIsRole = false;
  @track isValueSelected = false;
  @api objectApiName;
  @track showDropdown = false;
  @api searchKey;
  @api placeholderName;
  @api dropdownValues;

  @track selectedOption = ""; // To track the selected option from the dropdown
  @track dropdownOptions = [
    // Define the options for the dropdown
    { label: "Option 1", value: "option1" },
    { label: "Option 2", value: "option2" },
  ];

  handleOptionChange(event) {
    this.selectedOption = event.detail.value;
    console.log("Role selected: ");
    console.log(this.selectedOption);
  }

  async handleSearchChange(event) {
    console.log("dropdown Values sent:");
    //console.log(this.dropdownValues);

    let transformedFields = [];

    // Iterate through each object key in the map
    await Object.keys(this.dropdownValues).forEach((objectName) => {
      // Get the list of fields for the current object
      let fields = this.dropdownValues[objectName];

      // Concatenate each field name with the object name and add to the transformed list
      fields.forEach((field) => {
        transformedFields.push(`${objectName}.${field}`);
      });
    });

    //this.searchResults = transformedFields;
    //console.log(JSON.stringify(this.searchResults));

    console.log("objectApiName set: ");
    console.log(this.objectApiName);
    console.log("handle search change of customLookUp");
    // If a value has been selected, we should clear it when user starts typing
    if (this.isValueSelected === true) {
      this.isValueSelected = false;
    }

    this.searchTerm = event.target.value;
    console.log("this is the search term: ");
    console.log(this.searchTerm);
    //this.retrieveObjectFields();
    console.log(this.isValueSelected);

    if (this.searchTerm.length > 1 && this.isValueSelected === false) {
      // These fields should be queried by the parent object and then
      // just filtered here
      //this.retrieveObjectFields();
      //this.retrieveObjectRoleFields();

      this.filterFields(transformedFields);
    } else {
      this.searchResults = [];
    }
  }

  retrieveObjectFields() {
    getObjectFields({ objectApiName: this.objectApiName })
      .then((results) => {
        console.log(results);

        // Add a new string to the start of a new array
        const newArray = [
          //"[Roles]", // Your new string
          ...results, // The spread operator to add all elements from the existing array
        ];

        this.filterFields(newArray);
      })
      .catch((error) => {
        this.searchResults = [];
        console.error(error);
      });
  }

  filterFields(fields) {
    console.log("filtering");
    const searchTermLower = this.searchTerm.toLowerCase();
    let filteredResults = fields.filter((field) =>
      field.toLowerCase().includes(searchTermLower)
    );

    console.log(filteredResults);
    this.searchResults = filteredResults;
  }

  searchRecords() {
    searchRecords({
      objectName: this.objectApiName,
      searchTerm: `%${this.searchTerm}%`,
    })
      .then((results) => {
        this.searchResults = results;
        console.log("results:");
        console.log(results);
      })
      .catch((error) => {
        console.log(error);
        this.searchResults = [];
        // Handle the error
      });
  }

  handleSelect(event) {
    console.log("handleSelect");

    const target = event.target.closest("[data-id]");

    if (target) {
      const selectedId = target.dataset.id;
      const selectedName = target.dataset.name;
      //console.log(selectedName);

      if (selectedName.includes("Role:")) {
        // Perform your action here
        console.log("Selected name contains 'Role:'");
        this.selectedValueIsRole = true;
        this.showDropdown = true;
        // call getRoleFields here and populate the template
        this.fetchRoleOptions();
      } else {
        this.selectedValueIsRole = false;
        this.showDropdown = false;
      }

      console.log(`Selected ID: ${selectedId}`);

      this.isValueSelected = true;
      this.searchTerm = selectedName;
      this.searchResults = [];
    }
  }

  fetchRoleOptions() {
    // Example call, adjust parameters as needed
    getRoleFields({
      objectApiName: this.objectApiName,
      recordId: this.recordId,
      fieldNames: ["YourRoleFieldName"],
    })
      .then((result) => {
        // Assuming result is the expected list of role options
        this.dropdownOptions = result.map((option) => {
          return { label: option.Name, value: option.Id }; // Adjust based on actual result fields
        });
        this.showDropdown = true; // Show the dropdown after populating options
      })
      .catch((error) => {
        console.error("Error fetching role fields:", error);
        this.dropdownOptions = []; // Reset or handle error
      });
  }

  retrieveObjectRoleFields() {
    getJunctionAndRoleFields()
      .then((results) => {
        console.log("retrieveObjectFields");
        console.log(results);
        //this.processFieldResults(results["PatientRoleAssignment_c__c"]);
        this.processFieldResults(results["CMS_Role__c"]);
      })
      .catch((error) => {
        this.searchResults = [];
        console.error(error);
      });
  }

  async processFieldResults(fieldNames) {
    const searchTermLower = this.searchTerm.toLowerCase();
    let filteredResults = fieldNames
      // Ensure the field name is converted to lower case for comparison
      .filter((fieldName) => fieldName.toLowerCase().includes(searchTermLower))
      .map((fieldName) => ({
        Id: fieldName,
        // The original field name will be used as the Name (display value)
        //Name: "Role: " + fieldName.replace(/__c$/, "").replace(/_/g, " "), // Format for display
        Name: "Role: " + fieldName, // Format for display
      }));
    let searchResultsCombined = await [
      ...this.searchResults,
      ...filteredResults,
    ]; // Combine results
    this.searchResults = searchResultsCombined;
    console.log("combined");
    console.log(searchResultsCombined);
  }

  // Needed for pspdfkitFileSelecter to get the selected
  @api
  get currentSearchTerm() {
    return this.searchTerm;
  }

  @api
  get currentSearchKey() {
    return this.searchKey;
  }
}
