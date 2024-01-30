global with sharing class PSPDFKitController {
  public static contentVersion contVersion { get; set; }
  public static String conbase { get; set; }

  @AuraEnabled
  public static list<ContentDocument> getAttachmentDetails(string record_Id) {
    if (record_Id == null || record_Id == '') {
      return [SELECT Title, FileExtension, OwnerId FROM ContentDocument];
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
}
