const { time } = require('lib/time-utils.js');

interface Term {
	name: string
	value: string
	negated: boolean
}

enum Relation {
    OR = 'OR',
    AND = 'AND',
}

const tagFilter = (filters: Term[], withs: string[], conditions: string[], params: string[], relation: Relation) => {
	const tagIDs = `
	SELECT tags.id
	FROM tags
	WHERE tags.title
	LIKE ?`;

	const noteIDsWithTag = `
	SELECT note_tags.note_id AS id
	FROM note_tags
	WHERE note_tags.tag_id IN (${tagIDs})`;

	const requiredTags = filters.filter(x => x.name === 'tag' && !x.negated).map(x => x.value);
	const excludedTags = filters.filter(x => x.name === 'tag' && x.negated).map(x => x.value);

	if (relation === 'AND' && (requiredTags.length > 0)) {
		const withRequired = `
		notes_with_required_tags
		AS (
			SELECT note_tags.note_id as id
			FROM note_tags
			WHERE 1
			INTERSECT
			${new Array(requiredTags.length).fill(noteIDsWithTag).join(' INTERSECT ')}
		)`;

		const where = `
		AND ROWID IN (
			SELECT notes_normalized.ROWID
			FROM notes_with_required_tags
			JOIN notes_normalized
			ON notes_with_required_tags.id=notes_normalized.id
		)`;
		withs.push(withRequired);
		params.push(...requiredTags);
		conditions.push(where);
	}
	if (relation === 'AND' && (excludedTags.length > 0)) {
		const withExcluded = `
		notes_with_any_excluded_tags
		AS (
			SELECT note_tags.note_id as id
			FROM note_tags
			WHERE 0 UNION ${new Array(excludedTags.length).fill(noteIDsWithTag).join(' UNION ')}
		)`;

		const whereNot = `
		AND ROWID NOT IN (
			SELECT notes_normalized.ROWID
			FROM notes_with_any_excluded_tags
			JOIN notes_normalized
			ON notes_with_any_excluded_tags.id=notes_normalized.id
		)`;

		withs.push(withExcluded);
		params.push(...excludedTags);
		conditions.push(whereNot);
	}

	if (relation === 'OR' && (requiredTags.length > 0)) {
		const withRequired = `
		notes_with_any_required_tags
		AS (
			SELECT note_tags.note_id as id
			FROM note_tags
			WHERE 0 UNION ${new Array(requiredTags.length).fill(noteIDsWithTag).join(' UNION ')}
		)`;

		const where = `
		OR ROWID IN (
			SELECT notes_normalized.ROWID
			FROM notes_with_any_required_tags
			JOIN notes_normalized
			ON notes_with_any_required_tags.id=notes_normalized.id
		)`;
		withs.push(withRequired);
		params.push(...requiredTags);
		conditions.push(where);
	}

	if (relation === 'OR' && (excludedTags.length > 0)) {
		const allNotesWithTags = `
		all_notes_with_tags
		AS (
			SELECT DISTINCT note_tags.note_id AS id FROM note_tags
		)`;
		withs.push(allNotesWithTags); // for reuse

		const notesWithoutExcludedTag = `
		SELECT * FROM (
			SELECT *
			FROM all_notes_with_tags
			EXCEPT ${noteIDsWithTag}
		)`;

		const withNoExcluded = `
		notes_without_atleast_one_excluded_tag
		AS (
			${new Array(excludedTags.length).fill(notesWithoutExcludedTag).join(' UNION ')}
		)`;

		const where = `
		OR ROWID IN (
			SELECT notes_normalized.ROWID
			FROM notes_without_atleast_one_excluded_tag
			JOIN notes_normalized
			ON notes_without_atleast_one_excluded_tag.id=notes_normalized.id
		)`;
		withs.push(withNoExcluded);
		params.push(...excludedTags);
		conditions.push(where);
	}
};

const notebookFilter = (filters: Term[], withs: string[], conditions: string[], params: string[]) => {
	const notebooks = filters.filter(x => x.name === 'notebook' && !x.negated).map(x => x.value);
	if (notebooks.length === 0) return;

	const likes = new Array(notebooks.length).fill('folders.title LIKE ?').join(' OR ');
	const withInNotebook = `
	notebooks_in_scope(id)
	AS (
		SELECT folders.id
		FROM folders
		WHERE id
		IN (
			SELECT id
			FROM folders
			WHERE ${likes}
		)
		UNION ALL
		SELECT folders.id
		FROM folders
		JOIN notebooks_in_scope
		ON folders.parent_id=notebooks_in_scope.id
	)`;
	const where = `
	AND ROWID IN (
		SELECT notes_normalized.ROWID
		FROM notebooks_in_scope
		JOIN notes_normalized
		ON notebooks_in_scope.id=notes_normalized.parent_id
	)`;

	withs.push(withInNotebook);
	params.push(...notebooks);
	conditions.push(where);
};


const resourceFilter = (filters: Term[], withs: string[], conditions: string[], params: string[], relation: Relation) => {
	const resourceIDs = `
	SELECT resources.id
	FROM resources
	WHERE resources.mime LIKE ?`;

	const noteIDsWithResource = `
	SELECT note_resources.note_id AS id
	FROM note_resources
	WHERE note_resources.is_associated=1
	AND note_resources.resource_id IN (${resourceIDs})`;

	const requiredResources = filters.filter(x => x.name === 'resource' && !x.negated).map(x => x.value);
	const excludedResources = filters.filter(x => x.name === 'resource' && x.negated).map(x => x.value);

	if (relation === 'AND' && (requiredResources.length > 0)) {
		const withRequired = `
		notes_with_required_resources
		AS (
			SELECT note_resources.note_id as id
			FROM note_resources
			WHERE 1 INTERSECT ${new Array(requiredResources.length).fill(noteIDsWithResource).join(' INTERSECT ')}
		)`;

		const where = `
		AND ROWID IN (
			SELECT notes_normalized.ROWID
			FROM notes_with_required_resources
			JOIN notes_normalized
			ON notes_with_required_resources.id=notes_normalized.id
		)`;
		withs.push(withRequired);
		params.push(...requiredResources);
		conditions.push(where);
	}
	if (relation === 'AND' && (excludedResources.length > 0)) {
		const withExcluded = `
		notes_with_any_excluded_resources
		AS (
			SELECT note_resources.note_id as id
			FROM note_resources
			WHERE 0 UNION ${new Array(excludedResources.length).fill(noteIDsWithResource).join(' UNION ')}
		)`;

		const whereNot = `
		AND ROWID NOT IN (
			SELECT notes_normalized.ROWID
			FROM notes_with_any_excluded_resources
			JOIN notes_normalized
			ON notes_with_any_excluded_resources.id=notes_normalized.id
		)`;

		withs.push(withExcluded);
		params.push(...excludedResources);
		conditions.push(whereNot);
	}

	if (relation === 'OR' && (requiredResources.length > 0)) {
		const withRequired = `
		notes_with_any_required_resources
		AS (
			SELECT note_resources.note_id as id
			FROM note_resources
			WHERE 0 UNION ${new Array(requiredResources.length).fill(noteIDsWithResource).join(' UNION ')}
		)`;

		const where = `
		OR ROWID IN (
			SELECT notes_normalized.ROWID
			FROM notes_with_any_required_resources
			JOIN notes_normalized
			ON notes_with_any_required_resources.id=notes_normalized.id
		)`;

		withs.push(withRequired);
		params.push(...requiredResources);
		conditions.push(where);
	}

	if (relation === 'OR' && (excludedResources.length > 0)) {
		const allNotesWithResources = `
		all_notes_with_resources
		AS (
			SELECT DISTINCT note_resources.note_id AS id FROM note_resources
		)`;
		withs.push(allNotesWithResources); // for reuse

		const notesWithoutExcludedResource = `
		SELECT * FROM (
			SELECT *
			FROM all_notes_with_resources
			EXCEPT ${noteIDsWithResource}
		)`;

		const withNoExcluded = `
		notes_without_atleast_one_excluded_resource
		AS (
			${new Array(excludedResources.length).fill(notesWithoutExcludedResource).join(' UNION ')}
		)`;

		const where = `
		OR ROWID IN (
			SELECT notes_normalized.ROWID
			FROM notes_without_atleast_one_excluded_resource
			JOIN notes_normalized
			ON notes_without_atleast_one_excluded_resource.id=notes_normalized.id
		)`;
		withs.push(withNoExcluded);
		params.push(...excludedResources);
		conditions.push(where);
	}
};

const typeFilter = (filters: Term[], conditions: string[], relation: Relation) => {
	const typeOfNote = filters.filter(x => x.name === 'type' && !x.negated).map(x => x.value);
	typeOfNote.forEach(type => {
		if (relation === 'AND') {
			conditions.push(`AND notes_fts.is_todo IS ${type === 'todo' ? 1 : 0}`);
		}
		if (relation === 'OR') {
			conditions.push(`
			OR ROWID IN (
				SELECT ROWID
				FROM notes_normalized
				WHERE notes_normalized.is_todo=${type === 'todo' ? 1 : 0}
			)`);
		}
	});
};

const completedFilter = (filters: Term[], conditions: string[], relation: Relation) => {
	const values = filters.filter(x => x.name === 'iscompleted' && !x.negated).map(x => x.value);
	values.forEach(value => {
		if (relation === 'AND') {
			conditions.push(`AND notes_fts.is_todo IS 1 AND notes_fts.todo_completed IS ${value === '1' ? 'NOT 0' : '0'}`);
		}
		if (relation === 'OR') {
			conditions.push(`
			OR ROWID IN (
				SELECT ROWID
				FROM notes_normalized
				WHERE notes_normalized.is_todo = 1
				AND notes_normalized.todo_completed ${value === '1' ? '!= ' : '= '} 0
			)`);
		}
	});
};

const getUnixMs = (date:string): string => {
	const yyyymmdd = /^[0-9]{8}$/;
	const yyyymm = /^[0-9]{6}$/;
	const yyyy = /^[0-9]{4}$/;
	const smartValue = /^(day|week|month|year)-([0-9]+)$/i;

	if (yyyymmdd.test(date)) {
		return time.formatLocalToMs(date, 'YYYYMMDD').toString();
	} else if (yyyymm.test(date)) {
		return time.formatLocalToMs(date, 'YYYYMM').toString();
	} else if (yyyy.test(date)) {
		return time.formatLocalToMs(date, 'YYYY').toString();
	} else if (smartValue.test(date)) {
		const match = smartValue.exec(date);
		const timeUnit = match[1]; // eg. day, week, month, year
		const num = Number(match[2]); // eg. 1, 12, 101
		return time.goBackInTime(num, timeUnit);
	} else {
		throw new Error('Invalid date format!');
	}
};

const dateFilter = (filters: Term[], conditons: string[], params: string[], relation: Relation) => {
	const dateTerms = filters.filter(x => x.name === 'created' || x.name === 'updated');
	dateTerms.forEach(dateTerm => {
		conditons.push(`
		${relation} ROWID IN (
			SELECT ROWID
			FROM notes_normalized
			WHERE notes_normalized.user_${dateTerm.name}_time ${dateTerm.negated ? '<' : '>='} ?
		)`);
		params.push(getUnixMs(dateTerm.value));
	});
};


const locationFilter = (filters: Term[], conditons: string[], params: string[], relation: Relation) => {
	const locationTerms = filters.filter(x => x.name === 'latitude' || x.name === 'longitude' || x.name === 'altitude');

	locationTerms.forEach(locationTerm => {
		conditons.push(`
		${relation} ROWID IN (
			SELECT ROWID
			FROM notes_normalized
			WHERE notes_normalized.${locationTerm.name} ${locationTerm.negated ? '<' : '>='} ?
		)`);
		params.push(locationTerm.value);
	});
};

const addExcludeTextConditions = (excludedTerms: Term[], conditions:string[], params: string[], relation: Relation) => {
	const type = excludedTerms[0].name;

	if (excludedTerms && relation === 'AND') {
		conditions.push(`
		AND ROWID NOT IN (
			SELECT ROWID
			FROM notes_fts
			WHERE notes_fts.${type} MATCH ?
		)`);
		params.push(excludedTerms.map(x => x.value).join(' OR '));
	}

	if (excludedTerms && relation === 'OR') {
		excludedTerms.forEach(term => {
			conditions.push(`
			OR ROWID IN (
				SELECT *
				FROM (
					SELECT ROWID
					FROM notes_fts
					EXCEPT
					SELECT ROWID
					FROM notes_fts
					WHERE notes_fts.${type} MATCH ?
				)
			)`);
			params.push(term.value);
		});
	}
};


const textFilter = (filters: Term[], conditions: string[], params: string[], relation: Relation) => {
	const allTerms = filters.filter(x => x.name === 'title' || x.name === 'body' || x.name === 'text');

	const includedTerms = allTerms.filter(x => !x.negated);
	if (includedTerms.length > 0) {
		conditions.push(`${relation} notes_fts MATCH ?`);
		const termsToMatch = includedTerms.map(term => {
			if (term.name === 'text') return term.value;
			else return `${term.name}:${term.value}`;
		});
		const matchQuery = (relation === 'OR') ? termsToMatch.join(' OR ') : termsToMatch.join(' ');
		params.push(matchQuery);
	}

	const excludedTextTerms = allTerms.filter(x => x.name === 'text' && x.negated);
	const excludedTitleTerms = allTerms.filter(x => x.name === 'title' && x.negated);
	const excludedBodyTerms = allTerms.filter(x => x.name === 'body' && x.negated);

	if ((excludedTextTerms.length > 0) && relation === 'AND') {
		conditions.push(`
		AND ROWID NOT IN (
		SELECT ROWID
		FROM notes_fts
		WHERE notes_fts MATCH ?
		)`);
		params.push(excludedTextTerms.map(x => x.value).join(' OR '));
	}

	if ((excludedTextTerms.length > 0) && relation === 'OR') {
		excludedTextTerms.map(textTerm => {
			conditions.push(`
			OR ROWID IN (
			SELECT *
			FROM (
				SELECT ROWID
				FROM notes_fts
				EXCEPT
				SELECT ROWID FROM notes_fts
				WHERE notes_fts MATCH ?
			))`);
			params.push(textTerm.value);
		});
	}

	if (excludedTitleTerms.length > 0) {
		addExcludeTextConditions(excludedTitleTerms, conditions, params, relation);
	}

	if (excludedBodyTerms.length > 0) {
		addExcludeTextConditions(excludedBodyTerms, conditions, params, relation);
	}

};

const getDefaultRelation = (filters: Term[]): Relation => {
	const anyTerm = filters.find(term => term.name === 'any');
	if (anyTerm) { return (anyTerm.value === '1') ? Relation.OR : Relation.AND; }
	return Relation.AND;
};

const getConnective = (filters: Term[], relation: Relation): string => {
	const notebookTerm = filters.find(x => x.name === 'notebook');
	return (!notebookTerm && (relation === 'OR')) ? 'ROWID=-1' : '1'; // ROWID=-1 acts as 0 (something always false)
};

export default function queryBuilder(filters: Term[]) {
	const queryParts: string[] = [];
	const params: string[] = [];
	const withs: string[] = [];

	// console.log("testing beep beep boop boop")
	// console.log(filters);

	const relation: Relation = getDefaultRelation(filters);

	// console.log(`relations = ${relation}`);
	// console.log(filters);

	queryParts.push(`
	SELECT
	notes_fts.id,
	notes_fts.title,
	offsets(notes_fts) AS offsets,
	notes_fts.user_created_time,
	notes_fts.user_updated_time,
	notes_fts.is_todo,
	notes_fts.todo_completed,
	notes_fts.parent_id
	FROM notes_fts
	WHERE ${getConnective(filters, relation)}`);

	notebookFilter(filters, withs, queryParts, params);

	tagFilter(filters, withs, queryParts, params, relation);

	resourceFilter(filters, withs, queryParts, params, relation);

	textFilter(filters, queryParts, params, relation);

	typeFilter(filters, queryParts, relation);

	completedFilter(filters, queryParts, relation);

	dateFilter(filters, queryParts, params, relation);

	locationFilter(filters, queryParts, params, relation);

	let query;
	if (withs.length > 0) {
		query = ['WITH RECURSIVE' , withs.join(',') ,queryParts.join(' ')].join(' ');
	} else {
		query = queryParts.join(' ');
	}

	return { query, params };
}
