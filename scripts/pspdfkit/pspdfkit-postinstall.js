const ncp = require("ncp").ncp;
const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");

const staticResourcesDir = "./force-app/main/default/staticresources"
const pspdfkitJsDest = `${staticResourcesDir}/PSPDFKit.js`
const pspdfkitLibDest = `${staticResourcesDir}/PSPDFKit_lib/modern/pspdfkit-lib`

fs.rmSync(pspdfkitLibDest, { recursive: true, force: true });
fs.rmSync(pspdfkitJsDest, { force: true });

fs.mkdirSync(pspdfkitLibDest, { recursive: true });

// Copy the pspdfkit-lib files used by the Salesforce integration to the static resources folder
ncp(
  "./node_modules/pspdfkit/dist/modern/pspdfkit-lib/",
  pspdfkitLibDest,
  {
	filter(filepath) {
		const filename = path.basename(filepath);

		if (filename.startsWith('chunk-locale-')) {
			return true
		} else if (filename.startsWith('chunk-localedata-')) {
			return true
		} else if (filename.startsWith('chunk-standalone-')) {
			return true
		} else if (filename.startsWith('chunk-1373-')) {
			return true
		} else if (filename.startsWith('chunk-5148-')) {
			return true
		} else if (filename.startsWith('chunk-5635-')) {
			return true
		} else if (filename.startsWith('chunk-6630-')) {
			return true
		} else if (filename.startsWith('chunk-8609-')) {
			return true
		} else if (path.extname(filepath) === '.css' && !filename.startsWith('windows-')) {
			return true
		} else if (path.extname(filepath) === '.wasm') {
			return true
		} else if (path.extname(filepath) === '.woff2') {
			return true
		} else if (filename.endsWith('.wasm.js')) {
			return true
		} else if (filename === 'pspdfkit-lib') {
			return true
		}

		return false
	}
  },
  (err) => {
    err && console.error(err);

	const PSPDFKit_libZipDest = `${staticResourcesDir}/PSPDFKit_lib.zip`

	fs.rmSync(PSPDFKit_libZipDest, { force: true });

	const zip = new AdmZip();

	zip.addLocalFolder(`${staticResourcesDir}/PSPDFKit_lib`)

	zip.writeZip(PSPDFKit_libZipDest);
  }
);

// Copy the main pspdfkit.js bundle to the static resources folder
ncp("./node_modules/pspdfkit/dist/modern/pspdfkit.js", pspdfkitJsDest, (err) => {
  err && console.error(err);
});
