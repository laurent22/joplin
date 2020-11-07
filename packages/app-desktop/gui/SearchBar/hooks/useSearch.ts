import { useEffect } from 'react';
import CommandService from '@joplin/lib/services/CommandService';
const debounce = require('debounce');

export default function useSearch(query:string) {
	useEffect(() => {
		const search = debounce((query:string) => {
			CommandService.instance().execute('search', query);
		}, 500);

		search(query);

		return () => {
			search.clear();
		};
	}, [query]);
}
