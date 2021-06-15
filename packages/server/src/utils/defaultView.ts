import { View } from '../services/MustacheService';

// Populate a View object with some good defaults.
export default function(name: string): View {
	return {
		name: name,
		path: `index/${name}`,
		content: {},
		navbar: true,
	};
}
