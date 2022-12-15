## PSPDFKit for Salesforce Integration

PSPDFKit for Salesforce integration uses PSPDFKit for Web Standalone as a [static resource][]. When the integration is deployed to a Salesforce org, the static resources are automatically created. The static resources are then used to load the PSPDFKit for Web Standalone library in the Salesforce org.

PSPDFKit for Salesforce shares the same APIs as PSPDFKit for Web Standalone, so please use the web documentation when customizing your Salesforce application.

## Getting Started

To get started, you’ll need to:

- Set up a [Salesforce Developer Edition account][developer account]
- Install [Salesforce CLI][]
- The [latest stable version of Node.js][node.js].
- A package manager compatible with [npm][about-npm]. This guide contains usage examples for the [npm client][npm-client]. The npm client is installed with Node.js by default.

## Deploying the Package

To deploy the PSPDFKit package to your Salesforce org, follow these steps:

1. Download the [PSPDFKit for Salesforce project][repo] from GitHub, and then unpack the ZIP file.

Alternatively, run the following terminal command to clone the [PSPDFKit Salesforce repository][repo] from GitHub:

```bash
git clone https://github.com/PSPDFKit/salesforce.git
```

2. Navigate to the `salesforce` directory and run the following commands to install the dependencies and log in to your Salesforce org:

```bash
npm install

sfdx force:auth:web:login --setalias vscodeOrg --instanceurl https://login.salesforce.com --setdefaultusername
```

3. In the browser window that opens, log in to your Salesforce org, and authorize Salesforce CLI.

4. In the terminal, go to the `package.xml` file in the `manifest` folder within the PSPDFKit for Salesforce project.

5. Run the following command:

```bash
sfdx force:source:deploy -x package.xml
```

## Enabling Users to Use PSPDFKit

To enable users of your Salesforce org to use PSPDFKit, follow these steps:

1. In Salesforce, go to **Users** > **Permission Sets**.

2. Find **PSPDFKit Admin Access** in the list, and then click it.

3. Click **Manage Assignments**.

4. Click **Add Assignment**.

5. Select the users to authorize them to use PSPDFKit.

6. Click **Next**, and then click **Assign**.

## Changing the Security Settings

PSPDFKit for Salesforce requires Lightning Locker to protect Lightning web components, but Salesforce uses Lightning Web Security by default. To change the default security settings, follow these steps:

1. In Salesforce, go to **Security** > **Session Settings**.

2. Deselect **Use Lightning Web Security for Lightning web components**.

3. Scroll down and click **Save**.

## Using the PSPDFKit for Salesforce Integration

To use PSPDFKit in your Salesforce org, follow these steps:

1. Ensure you are logged in as a user authorized to use PSPDFKit.

2. In the top right corner, open the App Launcher.

3. Search for and click **PSPDFKit**.

4. Click `Choose a File` to upload local PDF files, or open a file from Salesforce.


## Next Steps

- [Open documents from Salesforce][]
- [Save files back to Salesforce][]

[Open documents from Salesforce]: https://pspdfkit.com/guides/web/open-a-document/from-salesforce/
[Save files back to Salesforce]:  https://pspdfkit.com/guides/web/save-a-document/to-salesforce/

[support team]: https://support.pspdfkit.com/hc/en-us/requests/new
[Salesforce]: https://www.salesforce.org/
[free]: /try/
[demo]: https://pspdfkit.com/demo/
[visual studio code]: https://code.visualstudio.com/
[developer account]: https://developer.salesforce.com/signup
[Salesforce CLI]: https://developer.salesforce.com/tools/sfdxcli
[repo]: https://github.com/PSPDFKit/salesforce/archive/refs/heads/master.zip
[auth]: https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/cli_reference_auth_web.htm
[permission]: https://help.salesforce.com/s/articleView?id=sf.perm_sets_overview.htm&type=5
[node.js]: https://nodejs.org/en/download/
[about-npm]: https://docs.npmjs.com/about-npm
[npm-client]: https://docs.npmjs.com/cli/v7/commands/npm
[static resource]: https://help.salesforce.com/s/articleView?id=sf.pages_static_resources.htm&type=5
