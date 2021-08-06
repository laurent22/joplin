import { View } from '../services/MustacheService';

// Populate a View object with some good defaults.
export default function(name: string, title: string): View {
	return {
		name: name,
		path: `index/${name}`,
		content: {},
		navbar: true,
		title: title,
		jsFiles: [],
		cssFiles: [],
	};
}
