const { pregQuote } = require('@joplin/lib/string-utils-common');

// Specifies how a to find the start/stop of a type of formatting
interface RegionMatchSpec {
	start: RegExp;
	end: RegExp;
}

// Describes a region's formatting
export interface RegionSpec {
	// The name of the node corresponding to the region in the syntax tree
	nodeName?: string;

	// Text to be inserted before and after the region when toggling.
	template: { start: string; end: string };

	// How to identify the region
	matcher: RegionMatchSpec;
}

export namespace RegionSpec { // eslint-disable-line no-redeclare
	interface RegionSpecConfig {
		nodeName?: string;
		template: string | { start: string; end: string };
		matcher?: RegionMatchSpec;
	}

	// Creates a new RegionSpec, given a simplified set of options.
	// If [config.template] is a string, it is used as both the starting and ending
	// templates.
	// Similarly, if [config.matcher] is not given, a matcher is created based on
	// [config.template].
	export const of = (config: RegionSpecConfig): RegionSpec => {
		let templateStart: string, templateEnd: string;
		if (typeof config.template === 'string') {
			templateStart = config.template;
			templateEnd = config.template;
		} else {
			templateStart = config.template.start;
			templateEnd = config.template.end;
		}

		const matcher: RegionMatchSpec =
			config.matcher ?? matcherFromTemplate(templateStart, templateEnd);

		return {
			nodeName: config.nodeName,
			template: { start: templateStart, end: templateEnd },
			matcher,
		};
	};

	const matcherFromTemplate = (start: string, end: string): RegionMatchSpec => {
		// See https://stackoverflow.com/a/30851002
		const escapedStart = pregQuote(start);
		const escapedEnd = pregQuote(end);

		return {
			start: new RegExp(escapedStart, 'g'),
			end: new RegExp(escapedEnd, 'g'),
		};
	};
}


