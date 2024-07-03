import { SqlQuery } from '../types';

export default (): (SqlQuery|string)[] => {
	return [
		'ALTER TABLE resources ADD COLUMN hash TEXT NOT NULL DEFAULT ""',
	];
};
