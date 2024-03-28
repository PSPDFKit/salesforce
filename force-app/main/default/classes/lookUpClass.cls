public with sharing class lookUpClass {
  @AuraEnabled(cacheable=true)
  public static List<SObject> searchRecords(
    String objectName,
    String searchTerm
  ) {
    // Make sure to validate the object name and prevent SOQL injection
    String validatedObjectName = String.escapeSingleQuotes(objectName);
    //String validatedObjectName = 'Name';
    String query =
      'SELECT Id, Name FROM ' +
      validatedObjectName +
      ' WHERE Name LIKE :searchTerm LIMIT 10';
    return Database.query(query);
  }
}
