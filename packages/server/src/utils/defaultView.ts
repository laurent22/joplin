import { User } from '../db';
import { View } from '../services/MustacheService';

// Populate a View object with some good defaults.
export default function(name: string, owner: User = null, extraContent:any = null, extraPartial:string[] = null): View {
	extraPartial = extraPartial || [];
	
	return {
		name: name,
		path: `index/${name}`,
		content: {
			owner,
			...extraContent,
		},
		cssFiles: [`index/${name}`],
		partials: ['navbar'].concat(extraPartial),
	};
}
