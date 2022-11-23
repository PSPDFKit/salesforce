const ncp = require("ncp").ncp;
const fs = require("fs");
const path = require("path");

const pspdfkitJsDest = "./force-app/main/default/staticresources/PSPDFKit.js"
const pspdfkitLibDest = "./force-app/main/default/staticresources/PSPDFKit_lib/modern/pspdfkit-lib"

fs.rmSync(pspdfkitLibDest, { recursive: true, force: true });

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
		} else if (path.extname(filepath) === '.woff') {
			return true
		} else if (path.extname(filepath) === '.woff2') {
			return true
		} else if (filename.endsWith('.wasm.js')) {
			return true
		} else if (filename.endsWith('.wasm')) {
			return true
		} else if (filename === 'pspdfkit-lib') {
			return true
		}

		return false
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
