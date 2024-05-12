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
  @api templatePlaceholder;
  @api selectedRole;
  @track hasData = false;

  @api children;
  @track childrenInputs = [];
  @api childrenInputApi;

  @track dropdownOptions = [];
  @track selectedOption = "";

  @track hasLabel = false;

  @api
  get dropDownOptionsApi() {
    console.log("dropdown options set");
    console.log(dropdownOptions);

    return this.dropdownOptions;
  }

  get hasChildren() {
    return this.childrenInputs.length > 0;
  }

  /*set dropDownOptionsApi(value) {
    this._dropDownOptionsApi = value;
    this.dropdownOptions = [...value]; // Update dropdownOptions whenever new options are passed
    this.showDropdown = true;
    this.selectedOption = value[0];
    console.log("dropdown options set");
    //console.log(this.dropdownOptions);
    //console.log(this._dropDownOptionsApi);
  }*/

  set dropDownOptionsApi(proxyObject) {
    if (proxyObject && Object.keys(proxyObject).length > 0) {
      this.showDropdown = true;

      // Convert the Proxy object to a regular object first
      const obj = JSON.parse(JSON.stringify(proxyObject));

      // Now map the object to the array format expected by the dropdown
      this.dropdownOptions = Object.keys(obj).map((key) => ({
        label: obj[key], // The text that will be shown in the dropdown
        value: obj[key], // The identifier for the selection
      }));

      this.hasData = true;
    } else {
      this.showDropdown = false;
      this.hasData = false;
      this.dropdownOptions = []; // Reset the options
    }
  }

  handleOptionChange(event) {
    this.selectedOption = event.detail.value;
    console.log("Role selected: ", this.selectedOption);
    this.selectedRole = this.selectedOption;

    this.selectedOption = event.detail.value;

    console.log("children length");
    console.log(this.children);
    if (this.children) {
      this.updateChildrenInputs();
    }
    //this.updateChildrenInputs();
  }

  updateChildrenInputs() {
    // Reset current children inputs
    this.childrenInputs = [];
    this.childrenInputApi = [];

    console.log("this.children");
    console.log(JSON.parse(JSON.stringify(this.children)));

    // Find the object in the children array that corresponds to the selected option
    let selectedChildrenObj = this.children.find((child) =>
      child.hasOwnProperty(this.selectedOption)
    );

    // Check if we found the corresponding children object and if it has the selectedOption as a key
    if (selectedChildrenObj && selectedChildrenObj[this.selectedOption]) {
      let selectedChildren = selectedChildrenObj[this.selectedOption];
      selectedChildren.forEach((childObject) => {
        console.log("child object selected");
        console.log(childObject);

        Object.entries(childObject).forEach(([key, value]) => {
          if (typeof value === "string" && key !== "templatePlaceholder") {
            // Push a simple object with label and value
            this.childrenInputs.push({
              label: key,
              value: value,
            });

            // If the key ends with a recognized property name, add a more detailed object
            if (key !== "templatePlaceholder") {
              this.childrenInputApi.push({
                label: key,
                value: value,
                templatePlaceholder: childObject.templatePlaceholder,
              });
            }
          }
        });
      });
    }
  }

  handleChildInputChange(event) {
    let label = event.target.label;
    let newValue = event.target.value;

    let childIndex = this.childrenInputs.findIndex((c) => c.label === label);
    if (childIndex !== -1) {
      this.childrenInputs[childIndex].value = newValue;
    }
  }

  handleSearchChange(event) {
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

    if (this.searchTerm.length > 2 && this.isValueSelected === false) {
      this.retrieveObjectFields();
      this.retrieveObjectRoleFields();
      //
    } else {
      this.searchResults = [];
    }
  }

  handleInputChange(event) {
    this.searchTerm = event.target.value;
    this.searchKey = event.target.value;
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
    let filteredResults = fields
      .filter((field) => field.toLowerCase().includes(searchTermLower))
      .map((field) => ({
        Id: field, // Use the field API name as Id
        Name: field, // Also use the field API name as Name for display
      }));

    console.log(filteredResults);
    this.searchResults = filteredResults;
    this.hasData = this.searchResults.length > 0;
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
    this.hasData = true;

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
}
