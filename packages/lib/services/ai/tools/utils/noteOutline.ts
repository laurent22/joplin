import MarkdownIt from 'markdown-it';

export interface OutlineSection {
	path: string;
	heading: string;
	level: number;
	// Character offsets into the body. The section starts on its heading line
	// and ends at the next heading of equal or higher level, so subsections are
	// always included.
	start: number;
	end: number;
}

export interface OutlineEntry {
	path: string;
	heading: string;
	chars: number;
}

interface RawHeading {
	level: number;
	text: string;
	start: number;
}

// Headings can contain newlines (multi-line setext headings) and tabs, both of
// which would break the line-based outline format. Collapsing whitespace is
// applied to the outline and to both sides of a section lookup, so a heading
// copied from the outline still resolves.
export const normalizeHeading = (heading: string) => heading.replace(/\s+/g, ' ').trim();

const lineOffsets = (body: string) => {
	const offsets = [0];
	for (let i = 0; i < body.length; i++) {
		if (body[i] === '\n') offsets.push(i + 1);
	}
	return offsets;
};

const parseHeadings = (body: string) => {
	const md = new MarkdownIt();
	const tokens = md.parse(body, {});
	const offsets = lineOffsets(body);
	const headings: RawHeading[] = [];

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (token.type !== 'heading_open' || !token.map) continue;
		const inline = tokens[i + 1];
		headings.push({
			level: Number(token.tag.substring(1)),
			text: inline && inline.type === 'inline' ? normalizeHeading(inline.content) : '',
			start: offsets[token.map[0]] ?? body.length,
		});
	}

	return headings;
};

// Positional paths are built from the heading nesting, e.g. "1", "1.1",
// "1.2.1". Section "0" is reserved for the content before the first heading.
const buildPaths = (headings: RawHeading[]) => {
	const stack: { level: number; counter: number }[] = [];
	const siblingCounts = new Map<string, number>();
	const paths: string[] = [];

	for (const heading of headings) {
		// Notes with irregular heading levels (a deep heading before a shallow
		// one, or a skipped level) must still produce unique paths, so each
		// heading is nested under the closest preceding shallower heading
		// rather than under its literal level.
		while (stack.length && stack[stack.length - 1].level >= heading.level) {
			stack.pop();
		}
		stack.push({ level: heading.level, counter: 0 });
		const parentPath = stack.slice(0, -1).map(s => s.counter).join('.');
		const siblings = (siblingCounts.get(parentPath) ?? 0) + 1;
		siblingCounts.set(parentPath, siblings);
		stack[stack.length - 1].counter = siblings;
		paths.push(stack.map(s => s.counter).join('.'));
	}

	return paths;
};

export const noteSections = (body: string): OutlineSection[] => {
	const headings = parseHeadings(body);
	const paths = buildPaths(headings);
	const sections: OutlineSection[] = [];

	const preambleEnd = headings.length ? headings[0].start : body.length;
	sections.push({ path: '0', heading: '', level: 0, start: 0, end: preambleEnd });

	for (let i = 0; i < headings.length; i++) {
		let end = body.length;
		for (let j = i + 1; j < headings.length; j++) {
			if (headings[j].level <= headings[i].level) {
				end = headings[j].start;
				break;
			}
		}
		sections.push({
			path: paths[i],
			heading: headings[i].text,
			level: headings[i].level,
			start: headings[i].start,
			end,
		});
	}

	return sections;
};

export const noteOutline = (body: string): OutlineEntry[] => {
	const sections = noteSections(body);
	// A note without headings is a single "0" section covering the whole body,
	// which tells the model to fall back to offset / max_chars.
	const entries = sections.length === 1 ? sections : sections.filter(s => s.path !== '0' || s.end > s.start);
	return entries.map(s => ({
		path: s.path,
		heading: s.heading,
		chars: s.end - s.start,
	}));
};

// Rendered as text rather than JSON: notes with hundreds of headings would
// produce an outline larger than the body cap it is meant to replace, and text
// lets it be paged with the same character offsets as the body.
export const renderOutline = (body: string) => {
	const lines = ['path\tchars\theading'];
	for (const entry of noteOutline(body)) {
		lines.push(`${entry.path}\t${entry.chars}\t${entry.heading}`);
	}
	return lines.join('\n');
};

export interface SectionResolution {
	section: OutlineSection|null;
	error: string|null;
}

const parentHeading = (sections: OutlineSection[], section: OutlineSection) => {
	const index = sections.indexOf(section);
	for (let i = index - 1; i >= 0; i--) {
		if (sections[i].level < section.level && sections[i].path !== '0') return sections[i].heading;
	}
	return null;
};

export const resolveSection = (body: string, address: string): SectionResolution => {
	const sections = noteSections(body);
	const trimmed = normalizeHeading(address);

	const byPath = sections.find(s => s.path === trimmed);
	if (byPath) return { section: byPath, error: null };

	if (/^[0-9]+(\.[0-9]+)*$/.test(trimmed)) {
		return { section: null, error: `Unknown section path: "${trimmed}". Call with outline: true to list the available sections.` };
	}

	const matches = sections.filter(s => s.path !== '0' && s.heading.toLowerCase() === trimmed.toLowerCase());
	if (matches.length === 1) return { section: matches[0], error: null };

	if (matches.length > 1) {
		const candidates = matches.map(s => {
			const parent = parentHeading(sections, s);
			return parent ? `${s.path} (under "${parent}")` : s.path;
		}).join(', ');
		return { section: null, error: `Several headings match "${trimmed}". Specify one of these paths instead: ${candidates}` };
	}

	return { section: null, error: `No section matches "${trimmed}". Call with outline: true to list the available sections.` };
};
