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
		partials: ['navbar'],
	};
}
