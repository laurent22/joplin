import { User } from '../db';
import { View } from '../services/MustacheService';

// Populate a View object with some good defaults.
export default function(name: string, owner: User = null): View {
	return {
		name: name,
		path: `index/${name}`,
		content: {
			owner,
		},
		cssFiles: [`index/${name}`],
		partials: ['navbar'],
	};
}
