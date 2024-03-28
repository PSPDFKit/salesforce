public with sharing class ObjectFieldRetriever {
  @AuraEnabled(cacheable=true)
  public static List<String> getObjectFields(String objectApiName) {
    List<String> fieldNames = new List<String>();
    Map<String, Schema.SObjectType> globalDescribe = Schema.getGlobalDescribe();
    Schema.SObjectType sObjectType = globalDescribe.get(objectApiName);
    if (sObjectType != null) {
      Schema.DescribeSObjectResult sObjectDescribe = sObjectType.getDescribe();
      Map<String, Schema.SObjectField> fieldMap = sObjectDescribe.fields.getMap();

      for (String fieldName : fieldMap.keySet()) {
        fieldNames.add(fieldName);
      }
    }
    return fieldNames;
  }

  @AuraEnabled(cacheable=true) // 'a01Dp0000055TPKIA2'
  //public static List<PatientRoleAssignment_c__c> getAssignedRoles(
  public static List<Intake_Role__c> getAssignedRoles(String patientId) {
    /*return [
      SELECT Id, Name, E_Mail__c, Patient_Record__c, Roles__c, Roles__r.Name
      FROM PatientRoleAssignment_c__c
      WHERE Patient_Record__c = :patientId
    ];*/
    return null;
  }

  @AuraEnabled(cacheable=true)
  public static Map<String, List<String>> getJunctionAndRoleFields() {
    Map<String, List<String>> objectFields = new Map<String, List<String>>();
    // Retrieve fields for PatientRoleAssignment__c
    /*objectFields.put(
      'PatientRoleAssignment_c__c',
      getFieldNames('PatientRoleAssignment_c__c')
    );*/
    // Retrieve fields for Roles__c
    //objectFields.put('Role__c', getFieldNames('Role__c'));

    objectFields.put('CMS_Role__c', getFieldNames('CMS_Role__c'));
    return objectFields;
  }

  private static List<String> getFieldNames(String objectApiName) {
    List<String> fieldNames = new List<String>();
    Map<String, Schema.SObjectType> globalDescribe = Schema.getGlobalDescribe();
    Schema.SObjectType sObjectType = globalDescribe.get(objectApiName);
    if (sObjectType != null) {
      Schema.DescribeSObjectResult sObjectDescribe = sObjectType.getDescribe();
      for (
        Schema.SObjectField sField : sObjectDescribe.fields.getMap().values()
      ) {
        fieldNames.add(sField.getDescribe().getName());
      }
    }
    return fieldNames;
  }
}
