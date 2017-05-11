import { AppRegistry } from 'react-native';
import { Database } from 'src/database.js'
import { Log } from 'src/log.js'
import { Root } from 'src/root.js';
import { BaseModel } from 'src/base-model.js';

function main() {
	let debugMode = true;
	let clientId = 'A7D301DA7D301DA7D301DA7D301DA7D3';

	AppRegistry.registerComponent('AwesomeProject', () => Root);

	let db = new Database();
	db.setDebugEnabled(debugMode);
	db.open();

	BaseModel.setDb(db);	
}

export { main }