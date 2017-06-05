require('app-module-path').addPath(__dirname);

import { WebApi } from 'src/web-api.js'

// setTimeout(() => {
// 	console.info('ici');
// }, 1000);


let api = new WebApi('http://joplin.local');

api.post('sessions', null, {
	email: 'laurent@cozic.net',
	password: '12345678',
}).then((session) => {
	console.info(session);
});