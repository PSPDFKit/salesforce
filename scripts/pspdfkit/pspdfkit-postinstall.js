const ncp = require("ncp").ncp;

const pspdfkitJsDest = "./force-app/main/default/staticresources/PSPDFKit.js"
const pspdfkitLibDest = "./force-app/main/default/staticresources/PSPDFKit_lib/modern/pspdfkit-lib"

if (!fs.existsSync(pspdfkitLibDest)){
    fs.mkdirSync(pspdfkitLibDest, { recursive: true });
}

// Copy the pspdfkit-lib files used by the Salesforce integration to the static resources folder
ncp(
  "./node_modules/pspdfkit/dist/pspdfkit-lib",
  pspdfkitLibDest,{
	filter(filename) {
      return true
	}
  },
  (err) => {
    err && console.error(err);
  }
);

// Copy the main pspdfkit.js bundle to the static resources folder
ncp("./node_modules/pspdfkit/dist/pspdfkit.js", pspdfkitJsDest, (err) => {
  err && console.error(err);
});
