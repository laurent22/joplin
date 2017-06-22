require('source-map-support').install();
require('babel-plugin-transform-runtime');

import { OneDriveApi } from 'src/onedrive-api.js';

const MicrosoftGraph = require("@microsoft/microsoft-graph-client");
const fs = require('fs-extra');
const path = require('path');

import { FileApiDriverOneDrive } from 'src/file-api-driver-onedrive.js';
import { FileApi } from 'src/file-api.js';

function configContent() {
	const configFilePath = path.dirname(__dirname) + '/config.json';
	return fs.readFile(configFilePath, 'utf8').then((content) => {
		return JSON.parse(content);
	});
}


async function main() {
 	let config = await configContent();

 	const fetch = require('node-fetch');

 	let options = {
 		headers: { 'Authorization': 'bearer ' + config.oneDriveToken },
 	};

 	// let api = new OneDriveApi('a');
 	// api.setToken(config.oneDriveToken);
 	// let r = await api.execText('GET', '/drive/root:/joplin/aaaaaaaaaaaaaaaaa.txt:/content');
 	// console.info(r);




 	//console.info(options);

 	// let response = await fetch('https://graph.microsoft.com/v1.0/drive/root:/joplin/aaaaaaaaaaaaaaaaa.txt:/content', options);

 	// console.info(response.ok);
 	// console.info(response.status);
 	// console.info(response.statusText);
 	// console.info(response.headers.get('Location'));

 	// let responseText = await response.text();
 	// console.info(responseText);




	let driver = new FileApiDriverOneDrive('e09fc0de-c958-424f-83a2-e56a721d331b', 'JA3cwsqSGHFtjMwd5XoF5L5');
	driver.api().setToken(config.oneDriveToken);

	//config.oneDriveToken);
	let api = new FileApi('/joplin', driver);

	let appDir = await driver.api().execJson('GET', '/drive/special/approot');

	console.info(appDir);

	// /drive/special/approot

	// await api.delete('eraseme.txt');

	// let result = await api.list();
	// console.info(result);

	//await api.put('aaaaaaaaaaaaaaaaa.txt', 'AAAAAAAAAAAA MOD');
	//onsole.info(content);



	// let content = await api.get('aaaaaaaaaaaaaaaaa.txt');
	// console.info(content);



	// let r = await api.setTimestamp('aaaaaaaaaaaaaaaaa.txt', 1498061000000);
	// console.info(r);


	// console.info('==============');

	// let stat = await api.stat('aaaaaaaaaaaaaaaaa.txt');
	// console.info(stat);

	// console.info(content);


// // const fetch = require('node-fetch');
// 	let content = await api.get('aaaaaaaaaaaaaaaaa.txt');
// 	console.info('CONTENT', content);

	// var token = '';
	// var client = MicrosoftGraph.Client.init({
	// 	authProvider: (done) => {
	// 		done(null, config.oneDriveToken);
	// 	}
	// });

	// LIST ITEMS

	//client.api('/drive/items/9ADA0EADFA073D0A%21109/children').get((err, res) => {
	//client.api('/drive/items/9ADA0EADFA073D0A%21109/children').get((err, res) => {
	//client.api('/drive/root:/joplin:/children').get((err, res) => {
	// client.api('/drive/root:/.:/children').get((err, res) => {
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

	// client.api('/drive/items/9ADA0EADFA073D0A%21110?select=name,lastModifiedDateTime').get((err, res) => {
	// 	console.log(err, res);
	// });
}

main().catch((error) => {
	console.error(error);
});