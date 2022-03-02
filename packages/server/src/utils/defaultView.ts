import { View } from '../services/MustacheService';

// Populate a View object with some good defaults.
export default function(name: string, title: string): View {
	const pathPrefix = name.startsWith('admin/') ? '' : 'index/';

	return {
		name: name,
		path: `${pathPrefix}/${name}`,
		content: {},
		navbar: true,
		title: title,
		jsFiles: [],
		cssFiles: [],
	};
}
