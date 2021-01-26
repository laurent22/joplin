import { Config } from "../../utils/types";

export default class Application {

	private config_:Config;

	public constructor(config:Config) {
		this.config_ = config;
	}

	public async initialize() {	
		const filePath = `${this.config_.tempDir}/joplin.sqlite`;
	
		// = new JoplinDatabase(new DatabaseDriverNode());
		// databases_[id].setLogger(dbLogger);
		// await databases_[id].open({ name: filePath });
	
		// BaseModel.setDb(databases_[id]);
		// await loadKeychainServiceAndSettings(options.keychainEnabled ? KeychainServiceDriver : KeychainServiceDriverDummy);
	}

}