import Logger from '@joplin/utils/Logger';
import JoplinServerApi from './JoplinServerApi';
import { Env } from './models/Setting';

const logger = Logger.create('JoplinCloudApi');

interface Options {
	baseUrl(): string;
	userContentBaseUrl(): string;
	username(): string;
	password(): string;
	env?: Env;
}

export default class JoplinCloudApi extends JoplinServerApi {

	public constructor(options: Options) {
		super(options);
		this.options_ = options;
	}

	protected async sessionId() {
		const session = await this.session();
		return session ? session.id : '';
	}

	protected async session() {
		if (this.session_) return this.session_;

		try {
			this.session_ = await this.exec_('POST', 'api/sessions', null, {
				id: this.options_.username(),
				password: this.options_.password(),
			});

			return this.session_;
		} catch (error) {
			logger.error('Could not acquire session:', error.details, '\n', error);
			throw error;
		}

	}

}
