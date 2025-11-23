"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.serialize = exports.noteToFrontMatter = exports.fieldOrder = void 0;
const Note_1 = require("../models/Note");
const time_1 = require("../time");
const yaml = require("js-yaml");
const convertDate = (datetime) => {
    return time_1.default.unixMsToRfc3339Sec(datetime);
};
exports.fieldOrder = ['title', 'id', 'updated', 'created', 'source', 'author', 'latitude', 'longitude', 'altitude', 'completed?', 'due', 'tags'];
// There is a special case (negative numbers) where the yaml library will force quotations
// These need to be stripped
function trimQuotes(rawOutput) {
    return rawOutput.split('\n').map(line => {
        const index = line.indexOf(': \'-');
        const indexWithSpace = line.indexOf(': \'- ');
        // We don't apply this processing if the string starts with a dash
        // followed by a space. Those should actually be in quotes, otherwise
        // they are detected as invalid list items when we later try to import
        // the file.
        if (index === indexWithSpace)
            return line;
        if (index >= 0) {
            // The plus 2 eats the : and space characters
            const start = line.substring(0, index + 2);
            // The plus 3 eats the quote character
            const end = line.substring(index + 3, line.length - 1);
            return start + end;
        }
        return line;
    }).join('\n');
}
const noteToFrontMatter = (note, tagTitles) => {
    const md = {};
    // Every variable needs to be converted separately, so they will be handles in groups
    //
    // title
    if (note.title) {
        md['title'] = note.title;
    }
    // source, author
    if (note.source_url) {
        md['source'] = note.source_url;
    }
    if (note.author) {
        md['author'] = note.author;
    }
    // locations
    // non-strict inequality is used here to interpret the location strings
    // as numbers i.e 0.000000 is the same as 0.
    // This is necessary because these fields are officially numbers, but often
    // contain strings.
    // eslint-disable-next-line eqeqeq
    if (note.latitude != 0 || note.longitude != 0 || note.altitude != 0) {
        md['latitude'] = note.latitude;
        md['longitude'] = note.longitude;
        md['altitude'] = note.altitude;
    }
    // todo
    if (note.is_todo) {
        // boolean is not support by the yaml FAILSAFE_SCHEMA
        md['completed?'] = note.todo_completed ? 'yes' : 'no';
    }
    if (note.todo_due) {
        md['due'] = convertDate(note.todo_due);
    }
    // time
    if (note.user_updated_time) {
        md['updated'] = convertDate(note.user_updated_time);
    }
    if (note.user_created_time) {
        md['created'] = convertDate(note.user_created_time);
    }
    // tags
    if (tagTitles.length)
        md['tags'] = tagTitles;
    // This guarentees that fields will always be ordered the same way
    // which can be useful if users are using this for generating diffs
    const sort = (a, b) => {
        return exports.fieldOrder.indexOf(a) - exports.fieldOrder.indexOf(b);
    };
    // The FAILSAFE_SCHEMA along with noCompatMode allows this to export strings that look
    // like numbers (or yes/no) without the added '' quotes around the text
    const rawOutput = yaml.dump(md, { sortKeys: sort, noCompatMode: true, schema: yaml.FAILSAFE_SCHEMA });
    // The additional trimming is the unfortunate result of the yaml library insisting on
    // quoting negative numbers.
    // For now the trimQuotes function only trims quotes associated with a negative number
    // but it can be extended to support more special cases in the future if necessary.
    return trimQuotes(rawOutput);
};
exports.noteToFrontMatter = noteToFrontMatter;
const serialize = async (modNote, tagTitles) => {
    const noteContent = await Note_1.default.replaceResourceInternalToExternalLinks(await Note_1.default.serialize(modNote, ['body']));
    const metadata = (0, exports.noteToFrontMatter)(modNote, tagTitles);
    return `---\n${metadata}---\n\n${noteContent}`;
};
exports.serialize = serialize;
function isTruthy(str) {
    return ['true', 'yes'].includes(str.toLowerCase());
}
// Enforces exactly 2 spaces in front of list items
function normalizeYamlWhitespace(yaml) {
    return yaml.map(line => {
        const l = line.trimStart();
        if (l.startsWith('-')) {
            return `  ${l}`;
        }
        return line;
    });
}
// This is a helper function to convert an arbitrary author variable into a string
// the use case is for loading from r-markdown/pandoc style notes
// references:
// https://pandoc.org/MANUAL.html#extension-yaml_metadata_block
// https://github.com/hao203/rmarkdown-YAML
function extractAuthor(author) {
    if (!author)
        return '';
    if (typeof (author) === 'string') {
        return author;
    }
    else if (Array.isArray(author)) {
        // Joplin only supports a single author, so we take the first one
        return extractAuthor(author[0]);
    }
    else if (typeof (author) === 'object') {
        if ('name' in author) {
            return author.name;
        }
    }
    return '';
}
const getNoteHeader = (note) => {
    // Ignore the leading `---`
    const lines = note.split('\n').slice(1);
    let inHeader = true;
    const headerLines = [];
    const bodyLines = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const nextLine = i + 1 <= lines.length - 1 ? lines[i + 1] : '';
        if (inHeader && line.startsWith('---')) {
            inHeader = false;
            // Need to eat the extra newline after the yaml block. Note that
            // if the next line is not an empty line, we keep it. Fixes
            // https://github.com/laurent22/joplin/issues/8802
            if (nextLine.trim() === '')
                i++;
            continue;
        }
        if (inHeader) {
            headerLines.push(line);
        }
        else {
            bodyLines.push(line);
        }
    }
    const normalizedHeaderLines = normalizeYamlWhitespace(headerLines);
    const header = normalizedHeaderLines.join('\n');
    const body = bodyLines.join('\n');
    return { header, body };
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const toLowerCase = (obj) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    const newObj = {};
    for (const key of Object.keys(obj)) {
        newObj[key.toLowerCase()] = obj[key];
    }
    return newObj;
};
const parse = (note) => {
    var _a, _b;
    if (!note.startsWith('---'))
        return { metadata: { body: note }, tags: [] };
    const { header, body } = getNoteHeader(note);
    const md = toLowerCase((_a = yaml.load(header, { schema: yaml.FAILSAFE_SCHEMA })) !== null && _a !== void 0 ? _a : {});
    const metadata = {
        title: md['title'] || '',
        source_url: md['source'] || '',
        is_todo: ('completed?' in md) ? 1 : 0,
    };
    if ('id' in md && typeof md['id'] === 'string' && md.id.match(/^[0-9a-zA-Z]{32}$/)) {
        metadata['id'] = md.id;
    }
    if ('author' in md) {
        metadata['author'] = extractAuthor(md['author']);
    }
    // The date fallback gives support for MultiMarkdown format, r-markdown, and pandoc formats
    if ('created' in md) {
        metadata['user_created_time'] = time_1.default.anythingToMs(md['created'], Date.now());
    }
    else if ('date' in md) {
        metadata['user_created_time'] = time_1.default.anythingToMs(md['date'], Date.now());
    }
    else if ('created_at' in md) {
        // Add support for Notesnook
        metadata['user_created_time'] = time_1.default.anythingToMs(md['created_at'], Date.now());
    }
    if ('updated' in md) {
        metadata['user_updated_time'] = time_1.default.anythingToMs(md['updated'], Date.now());
    }
    else if ('lastmod' in md) {
        // Add support for hugo
        metadata['user_updated_time'] = time_1.default.anythingToMs(md['lastmod'], Date.now());
    }
    else if ('date' in md) {
        metadata['user_updated_time'] = time_1.default.anythingToMs(md['date'], Date.now());
    }
    else if ('updated_at' in md) {
        // Notesnook
        metadata['user_updated_time'] = time_1.default.anythingToMs(md['updated_at'], Date.now());
    }
    if ('latitude' in md) {
        metadata['latitude'] = md['latitude'];
    }
    if ('longitude' in md) {
        metadata['longitude'] = md['longitude'];
    }
    if ('altitude' in md) {
        metadata['altitude'] = md['altitude'];
    }
    if (metadata.is_todo) {
        if (isTruthy(md['completed?'])) {
            // Completed time isn't preserved, so we use a sane choice here
            metadata['todo_completed'] = (_b = metadata['user_updated_time']) !== null && _b !== void 0 ? _b : Date.now();
        }
        if ('due' in md) {
            const due_date = time_1.default.anythingToMs(md['due'], null);
            if (due_date) {
                metadata['todo_due'] = due_date;
            }
        }
    }
    // Tags are handled separately from typical metadata
    let tags = [];
    if ('tags' in md) {
        // Only create unique tags
        tags = md['tags'];
    }
    else if ('keywords' in md) {
        // Adding support for r-markdown/pandoc
        tags = tags.concat(md['keywords']);
    }
    // Only create unique tags
    tags = [...new Set(tags)];
    metadata['body'] = body;
    return { metadata, tags };
};
exports.parse = parse;
