import { randomBytes } from 'crypto';
import { PythonProcessManagerApi } from '../interfaces/IPythonProcessManager';
import { RankingServiceApi } from '../interfaces/IRankingService';
import { RankResponse } from '../types/types';
import { PythonNlpError } from '../errors/errors';

export default class RankingService implements RankingServiceApi {
	public constructor(private readonly processManager: PythonProcessManagerApi) {}

	public async getSuggestions(word: string, sentence: string): Promise<RankResponse> {
		const response = await this.processManager.send({
			id: randomBytes(16).toString('hex'),
			word,
			context: sentence,
			topN: 10,
		});

		if (response.error) {
			throw new PythonNlpError(response.error);
		}

		return response;
	}
}
