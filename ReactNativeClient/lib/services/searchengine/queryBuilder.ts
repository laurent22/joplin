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

enum Operation {
	UNION = 'UNION',
	INTERSECT = 'INTERSECT'
}

enum Requirement {
	EXCLUSION = 'EXCLUSION',
	INCLUSION = 'INCLUSION'
}

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

const getOperator = (requirement: Requirement, relation: Relation): Operation => {
	if (relation === 'AND' && requirement === 'INCLUSION') { return Operation.INTERSECT; } else { return Operation.UNION; }
};

const filterByFieldName = (
	withs: string[],
	conditions: string[],
	params: string[],
	fieldValues: string[],
	field: string,
	notesWithFieldValue: string,
	requirement: Requirement,
	relation: Relation
) => {
	const operator: Operation = getOperator(requirement, relation);

	let withCondition = null;
	// with_${requirement}_${field} is added to the names to make them unique
	if (relation === Relation.OR && requirement === Requirement.EXCLUSION) {
		withs.push(`
		all_notes_with_${requirement}_${field}
		AS (
			SELECT DISTINCT note_${field}.note_id AS id FROM note_${field}
		)`);

		const notesWithoutExcludedField = `
		SELECT * FROM (
			SELECT *
			FROM all_notes_with_${requirement}_${field}
			EXCEPT ${notesWithFieldValue}
		)`;

		// We need notes without atleast one excluded tag/resource
		withCondition = `
		notes_with_${requirement}_${field}
		AS (
			${new Array(fieldValues.length)
		.fill(notesWithoutExcludedField)
		.join(' UNION ')}
		)`;

	} else {
		// Notes with any/all fieldValues depending upon relation and requirement
		withCondition = `
		notes_with_${requirement}_${field}
		AS (
			SELECT note_${field}.note_id as id
			FROM note_${field}
			WHERE
			${operator === 'INTERSECT' ? 1 : 0} ${operator}
			${new Array(fieldValues.length).fill(notesWithFieldValue).join(` ${operator} `)}
		)`;
	}

	// Get the ROWIDs that satisfy the condition so we can filter the result
	const whereCondition = `
	${relation} ROWID ${(relation === 'AND' && requirement === 'EXCLUSION') ? 'NOT' : ''}
	IN (
		SELECT notes_normalized.ROWID
		FROM notes_with_${requirement}_${field}
		JOIN notes_normalized
		ON notes_with_${requirement}_${field}.id=notes_normalized.id
	)`;

	withs.push(withCondition);
	params.push(...fieldValues);
	conditions.push(whereCondition);
};


const resourceFilter = (filters: Term[], withs: string[], conditions: string[], params: string[], relation: Relation) => {
	const fieldName = 'resources';

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

	if (requiredResources.length > 0) {
		filterByFieldName(withs, conditions, params, requiredResources, fieldName, noteIDsWithResource, Requirement.INCLUSION, relation);
	}

	if (excludedResources.length > 0) {
		filterByFieldName(withs, conditions, params, excludedResources, fieldName, noteIDsWithResource, Requirement.EXCLUSION, relation);
	}
};

const tagFilter = (filters: Term[], withs: string[], conditions: string[], params: string[], relation: Relation) => {
	const fieldName = 'tags';

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

	if (requiredTags.length > 0) {
		filterByFieldName(withs, conditions, params, requiredTags, fieldName, noteIDsWithTag, Requirement.INCLUSION, relation);
	}

	if (excludedTags.length > 0) {
		filterByFieldName(withs, conditions, params, excludedTags, fieldName, noteIDsWithTag, Requirement.EXCLUSION, relation);
	}
};

const getCondition = (filterName: string , value: string, relation: Relation) => {
	const tableName = (relation === 'AND') ? 'notes_fts' : 'notes_normalized';

	if (filterName === 'type') {
		return `${tableName}.is_todo IS ${value === 'todo' ? 1 : 0}`;
	} else if (filterName === 'iscompleted') {
		return `${tableName}.is_todo IS 1
		AND ${tableName}.todo_completed IS ${value === '1' ? 'NOT 0' : '0'}`;
	} else {
		throw new Error('Invalid field name.');
	}
};

const biConditionalFilter = (values: string[], conditions: string[], relation: Relation, filterName: string) => {
	// AND and OR are handled differently because FTS restricts how OR can be used.
	values.forEach(value => {
		if (relation === 'AND') {
			conditions.push(`
			AND ${getCondition(filterName, value, relation)}`);
		}
		if (relation === 'OR') {
			conditions.push(`
			OR ROWID IN (
				SELECT ROWID
				FROM notes_normalized
				WHERE ${getCondition(filterName, value, relation)}
			)`);
		}
	});
};

const typeFilter = (filters: Term[], conditions: string[], relation: Relation) => {
	const typeOfNote = filters.filter(x => x.name === 'type' && !x.negated).map(x => x.value);
	biConditionalFilter(typeOfNote, conditions, relation, 'type');
};

const completedFilter = (filters: Term[], conditions: string[], relation: Relation) => {
	const values = filters.filter(x => x.name === 'iscompleted' && !x.negated).map(x => x.value);
	biConditionalFilter(values, conditions, relation, 'iscompleted');
};

const genericFilter = (terms: Term[], conditions: string[], params: string[], relation: Relation, fieldName: string) => {
	terms.forEach(term => {
		conditions.push(`
		${relation} ROWID IN (
			SELECT ROWID
			FROM notes_normalized
			WHERE notes_normalized.${fieldName === 'date' ? `user_${term.name}_time` : `${term.name}`} ${term.negated ? '<' : '>='} ?
		)`);
		params.push(term.value);
	});
};

const locationFilter = (filters: Term[], conditons: string[], params: string[], relation: Relation) => {
	const locationTerms = filters.filter(x => x.name === 'latitude' || x.name === 'longitude' || x.name === 'altitude');
	genericFilter(locationTerms, conditons, params, relation, 'location');
};

const dateFilter = (filters: Term[], conditons: string[], params: string[], relation: Relation) => {
	const dateTerms = filters.filter(x => x.name === 'created' || x.name === 'updated');
	const unixDateTerms = dateTerms.map(term => { return { ...term, value: getUnixMs(term.value) }; });
	genericFilter(unixDateTerms, conditons, params, relation, 'date');
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
