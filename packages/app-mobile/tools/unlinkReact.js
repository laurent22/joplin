// const fs = require('fs');
// const { execSync } = require("child_process");

// const isWindows = process.platform === "win32";

// function toSystemSlashes(path) {
// 	const os = process.platform;
// 	if (os === 'win32') return path.replace(/\//g, '\\');
// 	return path.replace(/\\/g, '/');
// }

// const nodeModulesPath = `${__dirname}/../node_modules`;

// function deleteLink(path) {
// 	if (isWindows) {
// 		try {
// 			execSync(`rmdir "${toSystemSlashes(path)}"`, { stdio : 'pipe' });
// 		} catch (error) {
// 			// console.info('Error: ' + error.message);
// 		}
// 	} else {
// 		try {
// 			fs.unlinkSync(toSystemSlashes(path));
// 		} catch (error) {

// 		}
// 	}
// }

// deleteLink(nodeModulesPath + '/react');
// deleteLink(nodeModulesPath + '/react-dom');
