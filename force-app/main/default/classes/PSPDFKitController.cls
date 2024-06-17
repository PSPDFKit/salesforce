global with sharing class PSPDFKitController {
  public static contentVersion contVersion { get; set; }
  public static String conbase { get; set; }

  public class OptionWrapper {
    @AuraEnabled
    public String label;
    @AuraEnabled
    public String value;
    @AuraEnabled
    public String recordId;

    public OptionWrapper(String label, String value, String recordId) {
      this.label = label;
      this.value = value;
      this.recordId = recordId;
    }
  }

  @AuraEnabled
  public static list<ContentDocument> getAttachmentDetails(string record_Id) {
    if (record_Id == null || record_Id == '') {
      return [
        SELECT Title, FileExtension, OwnerId
        FROM ContentDocument
        WHERE FileExtension = 'docx'
      ];
    } else {
      list<ContentDocumentLink> doccontList = [
        SELECT contentDocumentId
        FROM ContentDocumentLink
        WHERE LinkedEntityId = :record_Id
      ];
      set<Id> idSet = new Set<Id>();
      for (ContentDocumentLink cd : doccontList) {
        idSet.add(cd.contentDocumentId);
      }
      list<ContentDocument> contentDocList = [
        SELECT Title, FileExtension, OwnerId
        FROM ContentDocument
        WHERE id IN :idSet
      ];
      return contentDocList;
    }
  }

  public string getFileDetail() {
    try {
      String recId = ApexPages.currentPage().getParameters().get('id');
      Map<String, String> filedNameVsValue = new Map<String, String>();
      if (recId != null) {
        contVersion = [
          SELECT
            Id,
            Title,
            contentDocumentId,
            PathOnClient,
            FileExtension,
            VersionData,
            IsMajorVersion
          FROM contentVersion
          WHERE
            IsLatest = TRUE
            AND contentDocumentId = :ApexPages.currentPage()
              .getParameters()
              .get('id')
        ];
        conbase = EncodingUtil.Base64Encode(contVersion.VersionData);
        return 'Success';
      } else {
        return null;
      }
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  @AuraEnabled
  public static Map<String, String> getbase64Data(String strId) {
    try {
      Map<String, String> filedNameVsValue = new Map<String, String>();
      ContentVersion newList = [
        SELECT
          Id,
          VersionData,
          FileType,
          Title,
          FileExtension,
          ContentDocumentId,
          PathOnClient
        FROM ContentVersion
        WHERE ContentDocumentId = :strId AND IsLatest = TRUE
      ];
      filedNameVsValue.put('ContentDocumentId', newList.ContentDocumentId);
      filedNameVsValue.put('PathOnClient', newList.PathOnClient);
      filedNameVsValue.put(
        'VersionData',
        EncodingUtil.Base64Encode(newList.VersionData)
      );
      return filedNameVsValue;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  @AuraEnabled
  public static String getbase64DataForTemplate(String documentTemplateId) {
    Map<String, String> fieldNameVsValue = new Map<String, String>();

    try {
      // Query ContentDocumentLink to get the ContentDocumentId
      ContentDocumentLink cdl = [
        SELECT ContentDocumentId
        FROM ContentDocumentLink
        WHERE LinkedEntityId = :documentTemplateId
        LIMIT 1
      ];

      /*if (cdl != null) {
        // Query for the latest ContentVersion
        ContentVersion latestVersion = [
          SELECT
            Id,
            ContentDocumentId,
            VersionData,
            PathOnClient,
            Title,
            FileExtension
          FROM ContentVersion
          WHERE ContentDocumentId = :cdl.ContentDocumentId AND IsLatest = TRUE
          LIMIT 1
        ]; 
      }*/
      return cdl.ContentDocumentId;
    } catch (Exception e) {
      throw new AuraHandledException(
        'Error retrieving document data: ' + e.getMessage()
      );
    }
  }

  @AuraEnabled
  public static Map<String, String> getbase64DataForSigning(String strId) {
    try {
      Map<String, String> filedNameVsValue = new Map<String, String>();
      ContentVersion newList = [
        SELECT
          Id,
          VersionData,
          FileType,
          Title,
          FileExtension,
          ContentDocumentId,
          PathOnClient
        FROM ContentVersion
        WHERE Id = :strId AND IsLatest = TRUE
      ];
      filedNameVsValue.put('ContentDocumentId', newList.ContentDocumentId);
      filedNameVsValue.put('PathOnClient', newList.PathOnClient);
      filedNameVsValue.put(
        'VersionData',
        EncodingUtil.Base64Encode(newList.VersionData)
      );
      return filedNameVsValue;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  //@AuraEnabled
  @RemoteAction
  public static String getFileAsArrayBuffer(String fileName) {
    try {
      // 1. Get the ContentDocumentId by its name
      List<ContentDocument> contentDocs = [
        SELECT Id, Title
        FROM ContentDocument
        WHERE Title = :fileName
        LIMIT 1
      ];

      if (contentDocs.isEmpty()) {
        return 'Error: No matching ContentDocument found for the provided fileName.';
      }

      ContentDocument contentDoc = contentDocs[0];

      // 2. Use this ContentDocumentId to get the VersionData
      List<ContentVersion> contentVers = [
        SELECT VersionData
        FROM ContentVersion
        WHERE ContentDocumentId = :contentDoc.Id AND IsLatest = TRUE
        LIMIT 1
      ];

      if (contentVers.isEmpty()) {
        return 'Error: No matching ContentVersion found for the provided ContentDocument.';
      }

      ContentVersion contentVer = contentVers[0];

      // 3. Convert the VersionData to an ArrayBuffer and return
      return EncodingUtil.Base64Encode(contentVer.VersionData).trim();
    } catch (Exception e) {
      return 'Error: ' + e.getMessage();
    }
  }

  @AuraEnabled(cacheable=true)
  public static Map<String, Object> getRecordFields(
    String objectApiName,
    Id recordId,
    List<String> fieldNames
  ) {
    // Ensure fieldNames is not empty and contains valid API names
    if (fieldNames.isEmpty()) {
      throw new AuraHandledException('Field names list is empty.');
    }

    // Construct SOQL query string dynamically based on field names
    String soqlQuery =
      'SELECT ' + String.join(new List<String>(fieldNames), ', ');
    soqlQuery += ' FROM ' + objectApiName + ' WHERE Id = :recordId LIMIT 1';

    // Execute the query and return the result
    sObject record = Database.query(soqlQuery);

    // Prepare a map to return field values
    Map<String, Object> fieldValues = new Map<String, Object>();
    for (String fieldName : fieldNames) {
      fieldValues.put(fieldName, record.get(fieldName));
    }

    return fieldValues;
  }

  @AuraEnabled(cacheable=true)
  public static List<Map<String, Object>> getRoleFields(
    String objectApiName,
    Id recordId,
    List<String> fieldNames
  ) {
    // Ensure fieldNames is not empty and contains valid API names
    if (fieldNames.isEmpty()) {
      throw new AuraHandledException('Field names list is empty.');
    }

    // Construct SOQL query string dynamically based on field names
    String soqlQuery =
      'SELECT ' + String.join(new List<String>(fieldNames), ', ');
    soqlQuery +=
      ' FROM ' +
      objectApiName +
      ' WHERE Case__c = :recordId LIMIT 2';

    // Execute the query and return the result
    List<sObject> records = Database.query(soqlQuery);

    // Prepare a list to return field values for each record
    List<Map<String, Object>> allRecordsFieldValues = new List<Map<String, Object>>();

    for (sObject record : records) {
      Map<String, Object> fieldValues = new Map<String, Object>();
      for (String fieldName : fieldNames) {
        fieldValues.put(fieldName, record.get(fieldName));
      }
      allRecordsFieldValues.add(fieldValues);
    }

    return allRecordsFieldValues;
  }

  @AuraEnabled
  public static Map<String, Object> fetchAttachedDocumentFile(String recordId) {
    Map<String, Object> result = new Map<String, Object>();
    try {
      // Fetch the ContentDocumentLink for the record
      ContentDocumentLink cdl = [
        SELECT ContentDocumentId
        FROM ContentDocumentLink
        WHERE LinkedEntityId = :recordId
        LIMIT 1
      ];

      if (cdl != null) {
        // Fetch the ContentVersion associated with the ContentDocument
        ContentVersion contentVersion = [
          SELECT Title, ContentDocumentId, VersionData
          FROM ContentVersion
          WHERE ContentDocumentId = :cdl.ContentDocumentId AND IsLatest = TRUE
          LIMIT 1
        ];

        if (contentVersion != null) {
          result.put('DocumentTitle', contentVersion.Title);
          result.put('ContentDocumentId', contentVersion.ContentDocumentId);
          result.put(
            'VersionData',
            EncodingUtil.base64Encode(contentVersion.VersionData)
          );
        } else {
          result.put(
            'Error',
            'No document content found for the attached document.'
          );
        }
      } else {
        result.put(
          'Error',
          'No document link found for the provided record ID.'
        );
      }
    } catch (Exception e) {
      result.put('Error', e.getMessage());
    }
    return result;
  }

  @AuraEnabled(cacheable=true)
  public static String getTemplateJson(Id recordId) {
    BD_Document_Templates__c templateRecord = [
      SELECT PSPDFKit_TemplateJson__c
      FROM BD_Document_Templates__c
      WHERE Id = :recordId
      LIMIT 1
    ];
    return templateRecord.PSPDFKit_TemplateJson__c;
  }

  @AuraEnabled(cacheable=true)
  public static String getAvailableObject(Id recordId) {
    BD_Document_Templates__c templateRecord = [
      SELECT BD_Available_On_Objects__c
      FROM BD_Document_Templates__c
      WHERE Id = :recordId
      LIMIT 1
    ];
    return templateRecord.BD_Available_On_Objects__c;
  }

  @AuraEnabled(cacheable=true)
  public static String getRelatedObjectFieldsString(
    Id recordId,
    String availableObject
  ) {
    // Fetch the record with the Related_Objects__c field
    BD_Document_Templates__c templateRecord = [
      SELECT Related_Objects_long__c
      FROM BD_Document_Templates__c
      WHERE Id = :recordId
      LIMIT 1
    ];

    return templateRecord.Related_Objects_long__c;
  }

  //@AuraEnabled(cacheable=true)
  public static Map<String, List<String>> getRelatedObjectFields(
    Id recordId,
    String availableObject
  ) {
    // Fetch the record with the Related_Objects__c field
    BD_Document_Templates__c templateRecord = [
      SELECT Related_Objects__c
      FROM BD_Document_Templates__c
      WHERE Id = :recordId
      LIMIT 1
    ];

    Map<String, List<String>> objectFieldsMap = new Map<String, List<String>>();
    if (templateRecord.Related_Objects__c != null) {
      // Split the Related_Objects__c field into individual object API names
      List<String> relatedObjects = templateRecord.Related_Objects__c.split(
        ';'
      );

      // Process each object name
      for (String objectName : relatedObjects) {
        objectName = objectName.trim(); // Clean up any extra whitespace
        List<String> fieldsList = getFieldNamesForSObject(objectName);
        if (fieldsList != null) {
          objectFieldsMap.put(objectName, fieldsList);
        }
      }
    }

    // Additional logic to get fields for the availableObject if it's provided
    if (String.isNotBlank(availableObject)) {
      List<String> availableObjectFields = getFieldNamesForSObject(
        availableObject
      );
      if (availableObjectFields != null) {
        objectFieldsMap.put(availableObject, availableObjectFields);
      }
    }

    return objectFieldsMap;
  }

  private static List<String> getFieldNamesForSObject(String objectApiName) {
    Map<String, Schema.SObjectType> globalDescribe = Schema.getGlobalDescribe();
    Schema.SObjectType sObjectType = globalDescribe.get(objectApiName);
    if (sObjectType != null) {
      Schema.DescribeSObjectResult describeResult = sObjectType.getDescribe();
      List<String> fieldNames = new List<String>();
      for (
        Schema.SObjectField field : describeResult.fields.getMap().values()
      ) {
        fieldNames.add(field.getDescribe().getName());
      }
      return fieldNames;
    }
    return null; // Return null if object name is not valid
  }

  @AuraEnabled(cacheable=true)
  public static BD_Document_Templates__c getDocumentTemplateJsonByDocumentId(
    Id documentId
  ) {
    BD_Document_Templates__c template = [
      SELECT PSPDFKit_TemplateJson__c, Name
      FROM BD_Document_Templates__c
      WHERE Id = :documentId
      LIMIT 1
    ];

    // Return the template SObject if found
    return template;
  }

  @AuraEnabled(cacheable=true)
  public static Object getRecordValue(
    String tableName,
    String fieldName,
    Id recordId
  ) {
    // Construct SOQL query to fetch a single record field value
    SObject record = Database.query(
      'SELECT ' + fieldName + ' FROM ' + tableName + ' WHERE Id = :recordId'
    );
    return record.get(String.valueOf(fieldName));
  }

  @AuraEnabled(cacheable=true)
  public static List<Map<String, String>> getRecordList(
    String tableName,
    String databaseField,
    String recordId,
    String referenceField
  ) {
    // If reference field connecting related object
    // has been given, use it, otherwise use default.
    List<SObject> records;
    if (String.isNotBlank(referenceField)) {
      // Use "Case__c" as the relationship field for role-related queries
      records = Database.query(
        'SELECT ' +
          databaseField +
          ', Id FROM ' +
          tableName +
          ' WHERE ' +
          referenceField +
          ' = :recordId'
      );
    } else {
      // Use "Case__c" as the relationship field for role-related queries
      records = Database.query(
        'SELECT ' +
          databaseField +
          ', Id FROM ' +
          tableName +
          ' WHERE Case__c = :recordId'
      );
    }

    List<Map<String, String>> values = new List<Map<String, String>>();
    for (SObject record : records) {
      Map<String, String> recordMap = new Map<String, String>();

      Object fieldValue = record.get(databaseField);
      if (fieldValue != null) {
        if (fieldValue instanceof Decimal) {
          recordMap.put('value', ((Decimal) fieldValue).format());
        } else {
          recordMap.put('value', String.valueOf(fieldValue));
        }
      } else {
        recordMap.put('value', null);
      }

      recordMap.put('Id', String.valueOf(record.get('Id')));
      values.add(recordMap);
    }
    return values;
  }

  @AuraEnabled(cacheable=true)
  public static String getRelatedRecord(
    String recordId,
    String tableName,
    String relationshipReferenceField,
    String relationshipField
  ) {
    // Generate dynamic SOQL query strings
    String baseQuery =
      'SELECT ' +
      relationshipReferenceField +
      ' FROM ' +
      tableName +
      ' WHERE Id = :recordId';
    SObject record = Database.query(baseQuery);
    if (record == null) {
      return 'Record not found';
    }

    // Extract the relationship ID from the record
    Id relatedRecordId = (Id) record.get(relationshipReferenceField);
    if (relatedRecordId == null) {
      return 'Related record not found';
    }

    // Get the field token for the relationship field, and determine the related object type
    Schema.DescribeFieldResult fieldDescription = record.getSObjectType()
      .getDescribe()
      .fields.getMap()
      .get(relationshipReferenceField)
      .getDescribe();
    String relatedObjectName = fieldDescription.getReferenceTo()[0]
      .getDescribe()
      .getName();

    // Fetch the related object field value using the determined object name
    SObject relatedRecord = Database.query(
      'SELECT ' +
        relationshipField +
        ' FROM ' +
        relatedObjectName +
        ' WHERE Id = :relatedRecordId'
    );
    return (String) relatedRecord.get(String.valueOf(relationshipField));
  }

  @AuraEnabled(cacheable=true)
  public static List<String> getRelatedLookupRecord(
    String parentId,
    String childId,
    String tableName,
    String relationshipReferenceField,
    String relationshipField,
    String referenceField
  ) {
    List<SObject> records;
    String baseQuery;
    // If a custom referenceField was given in the related object
    if (String.isNotBlank(referenceField) && String.isNotBlank(childId)) {
      // Generate dynamic SOQL query strings
      baseQuery =
        'SELECT ' +
        String.escapeSingleQuotes(relationshipReferenceField) +
        ' FROM ' +
        String.escapeSingleQuotes(tableName) +
        ' WHERE ' +
        String.escapeSingleQuotes(referenceField) +
        ' = :parentId AND Id = :childId';
      /*parentId +
        ' AND  Id = ' +
        childId;*/

      /*records = Database.query(baseQuery);

      if (records.isEmpty()) {
        //return new List<String>{ 'Record not found' };
        return new List<String>{ baseQuery };
      }*/
    } else if (
      String.isNotBlank(referenceField) && !String.isNotBlank(childId)
    ) {
      baseQuery =
        'SELECT ' +
        String.escapeSingleQuotes(relationshipReferenceField) +
        ' FROM ' +
        String.escapeSingleQuotes(tableName) +
        ' WHERE ' +
        String.escapeSingleQuotes(referenceField) +
        ' = :parentId';
    } else if (
      String.isNotBlank(parentId) && !String.isNotBlank(referenceField)
    ) {
      // Generate dynamic SOQL query strings
      baseQuery =
        'SELECT ' +
        relationshipReferenceField +
        ' FROM ' +
        tableName +
        ' WHERE Case__c = :parentId';

      /*records = Database.query(baseQuery);

      if (records.isEmpty()) {
        return new List<String>{ 'Error in retrieving data - parent' };
        //return new List<String>{ baseQuery };
      }*/
    } else {
      // Generate dynamic SOQL query strings
      baseQuery =
        'SELECT ' +
        relationshipReferenceField +
        ' FROM ' +
        tableName +
        ' WHERE Id = :childId';

      /*records = Database.query(baseQuery);

      if (records.isEmpty()) {
        //return new List<String>{ 'Record not found' };
        //return new List<String>{ baseQuery };
        return new List<String>{ 'Error in retrieving data - child' };
      }*/
    }

    //return new List<String>{ baseQuery };

    try {
      records = Database.query(baseQuery);
    } catch (QueryException e) {
      // Handle the exception here, e.g., log the error or notify someone

      //return new List<String>{ baseQuery };
      return new List<String>{ 'No values found.' };
    }

    List<String> allRelatedValues = new List<String>();

    for (SObject record : records) {
      // Extract the relationship ID from each record
      Id relatedRecordId = (Id) record.get(relationshipReferenceField);
      if (relatedRecordId == null) {
        continue; // Skip if no related record ID is found
      }

      // Get the field token for the relationship field, and determine the related object type
      Schema.DescribeFieldResult fieldDescription = record.getSObjectType()
        .getDescribe()
        .fields.getMap()
        .get(relationshipReferenceField)
        .getDescribe();
      String relatedObjectName = fieldDescription.getReferenceTo()[0]
        .getDescribe()
        .getName();

      // Fetch the related object field value using the determined object name
      String relatedQuery =
        'SELECT ' +
        relationshipField +
        ' FROM ' +
        relatedObjectName +
        ' WHERE Id = :relatedRecordId';
      List<SObject> relatedRecords = Database.query(relatedQuery);
      for (SObject relatedRecord : relatedRecords) {
        String fieldValue = (String) relatedRecord.get(relationshipField);
        if (fieldValue != null) {
          allRelatedValues.add(String.valueOf(fieldValue));
        }
      }
    }

    return allRelatedValues; // Returns a list of values from all the related records */
  }

  @AuraEnabled
  public static void resetDocumentSelection(Id recordId, String objectName) {
    String query =
      'SELECT BD_Document_Selection__c FROM ' +
      objectName +
      ' WHERE Id = :recordId LIMIT 1';
    SObject obj = Database.query(query);

    // Check if the returned SObject is not null
    if (obj != null) {
      obj.put('BD_Document_Selection__c', null);
      update obj;
    }
  }
}
