require('source-map-support').install();
require('babel-plugin-transform-runtime');
const MicrosoftGraph = require("@microsoft/microsoft-graph-client");
const fs = require('fs-extra');
const path = require('path');

function configContent() {
	const configFilePath = path.dirname(__dirname) + '/config.json';
	return fs.readFile(configFilePath, 'utf8').then((content) => {
		return JSON.parse(content);
	});
}


async function main() {
	let config = await configContent();

	var token = '';
	var client = MicrosoftGraph.Client.init({
		authProvider: (done) => {
			done(null, config.oneDriveToken);
		}
	});

	// LIST ITEMS

	// client.api('/drive/items/9ADA0EADFA073D0A%21109/children').get((err, res) => {
	// 	console.log(err, res);
	// });

	// SET ITEM CONTENT

	// client.api('/drive/items/9ADA0EADFA073D0A%21109:/test.txt:/content').put('testing', (err, res) => {
	// 	console.log(err, res);
	// });

	// SET ITEM CONTENT

	// client.api('/drive/items/9ADA0EADFA073D0A%21109:/test2.txt:/content').put('testing deux', (err, res) => {
	// 	console.log(err, res);
	// });

	// DELETE ITEM

	// client.api('/drive/items/9ADA0EADFA073D0A%21111').delete((err, res) => {
	// 	console.log(err, res);
	// });

	// GET ITEM METADATA

	client.api('/drive/items/9ADA0EADFA073D0A%21110?select=name,lastModifiedDateTime').get((err, res) => {
		console.log(err, res);
	});
}

main().catch((error) => {
	console.error(error);
});