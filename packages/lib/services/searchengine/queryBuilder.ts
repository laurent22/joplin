import time from '../../time';

interface Term {
	name: string;
	value: string;
	negated: boolean;
	quoted?: boolean;
}

enum Relation {
    OR = 'OR',
    AND = 'AND',
}

enum Operation {
	UNION = 'UNION',
	INTERSECT = 'INTERSECT',
}

enum Requirement {
	EXCLUSION = 'EXCLUSION',
	INCLUSION = 'INCLUSION',
}

const _notebookFilter = (notebooks: string[], requirement: Requirement, conditions: string[], params: string[], withs: string[], useFTS: boolean) => {
	if (notebooks.length === 0) return;

	const likes = [];
	for (let i = 0; i < notebooks.length; i++) {
		likes.push('folders.title LIKE ?');
	}

	const relevantFolders = likes.join(' OR ');

	const viewName = requirement === Requirement.EXCLUSION ? 'notebooks_not_in_scope' : 'notebooks_in_scope';
	const withInNotebook = `
	${viewName}(id)
	AS (
		SELECT folders.id
		FROM folders
		WHERE id
		IN (
			SELECT id
			FROM folders
			WHERE ${relevantFolders}
		)
		UNION ALL
		SELECT folders.id
		FROM folders
		JOIN ${viewName}
		ON folders.parent_id=${viewName}.id
	)`;

	const tableName = useFTS ? 'notes_normalized' : 'notes';
	const where = `
	AND ROWID ${requirement === Requirement.EXCLUSION ? 'NOT' : ''} IN (
		SELECT ${tableName}.ROWID
		FROM ${viewName}
		JOIN ${tableName}
		ON ${viewName}.id=${tableName}.parent_id
	)`;


	withs.push(withInNotebook);
	params.push(...notebooks);
	conditions.push(where);

};

const notebookFilter = (terms: Term[], conditions: string[], params: string[], withs: string[], useFTS: boolean) => {
	const notebooksToInclude = terms.filter(x => x.name === 'notebook' && !x.negated).map(x => x.value);
	_notebookFilter(notebooksToInclude, Requirement.INCLUSION, conditions, params, withs, useFTS);

	const notebooksToExclude = terms.filter(x => x.name === 'notebook' && x.negated).map(x => x.value);
	_notebookFilter(notebooksToExclude, Requirement.EXCLUSION, conditions, params, withs, useFTS);
};



const getOperator = (requirement: Requirement, relation: Relation): Operation => {
	if (relation === 'AND' && requirement === 'INCLUSION') { return Operation.INTERSECT; } else { return Operation.UNION; }
};

const filterByTableName = (
	terms: Term[],
	conditions: string[],
	params: string[],
	relation: Relation,
	noteIDs: string,
	requirement: Requirement,
	withs: string[],
	tableName: string,
	useFTS: boolean
) => {
	const operator: Operation = getOperator(requirement, relation);

	const values = terms.map(x => x.value);

	let withCondition = null;

	if (relation === Relation.OR && requirement === Requirement.EXCLUSION) {
		// with_${requirement}_${tableName} is added to the names to make them unique
		withs.push(`
		all_notes_with_${requirement}_${tableName}    
		AS (
			SELECT DISTINCT note_${tableName}.note_id AS id FROM note_${tableName}
		)`);

		const notesWithoutExcludedField = `
		SELECT * FROM (
			SELECT *
			FROM all_notes_with_${requirement}_${tableName}
			EXCEPT ${noteIDs}
		)`;

		const requiredNotes = [];
		for (let i = 0; i < values.length; i++) {
			requiredNotes.push(notesWithoutExcludedField);
		}
		const requiredNotesQuery = requiredNotes.join(' UNION ');

		// We need notes without atleast one excluded (tag/resource)
		withCondition = `
		notes_with_${requirement}_${tableName}
		AS (
			${requiredNotesQuery}
		)`;

	} else {
		const requiredNotes = [];
		for (let i = 0; i < values.length; i++) {
			requiredNotes.push(noteIDs);
		}
		const requiredNotesQuery = requiredNotes.join(` ${operator} `);


		// Notes with any/all values depending upon relation and requirement
		withCondition = `
		notes_with_${requirement}_${tableName}
		AS (
			SELECT note_${tableName}.note_id as id
			FROM note_${tableName}
			WHERE
			${operator === 'INTERSECT' ? 1 : 0} ${operator}
			${requiredNotesQuery}
		)`;
	}

	// Get the ROWIDs that satisfy the condition so we can filter the result
	const targetTableName = useFTS ? 'notes_normalized' : 'notes';
	const whereCondition = `
	${relation} ROWID ${(relation === 'AND' && requirement === 'EXCLUSION') ? 'NOT' : ''}
	IN (
		SELECT ${targetTableName}.ROWID
		FROM notes_with_${requirement}_${tableName}
		JOIN ${targetTableName}
		ON notes_with_${requirement}_${tableName}.id=${targetTableName}.id
	)`;

	withs.push(withCondition);
	params.push(...values);
	conditions.push(whereCondition);
};


const resourceFilter = (terms: Term[], conditions: string[], params: string[], relation: Relation, withs: string[], useFTS: boolean) => {
	const tableName = 'resources';

	const resourceIDs = `
	SELECT resources.id
	FROM resources
	WHERE resources.mime LIKE ?`;

	const noteIDsWithResource = `
	SELECT note_resources.note_id AS id
	FROM note_resources
	WHERE note_resources.is_associated=1
	AND note_resources.resource_id IN (${resourceIDs})`;

	const requiredResources = terms.filter(x => x.name === 'resource' && !x.negated);
	const excludedResources = terms.filter(x => x.name === 'resource' && x.negated);

	if (requiredResources.length > 0) {
		filterByTableName(requiredResources, conditions, params, relation, noteIDsWithResource, Requirement.INCLUSION, withs, tableName, useFTS);
	}

	if (excludedResources.length > 0) {
		filterByTableName(excludedResources, conditions, params, relation, noteIDsWithResource, Requirement.EXCLUSION, withs, tableName, useFTS);
	}
};

const tagFilter = (terms: Term[], conditions: string[], params: string[], relation: Relation, withs: string[], useFTS: boolean) => {
	const tableName = 'tags';

	const tagIDs = `
	SELECT tags.id
	FROM tags
	WHERE tags.title
	LIKE ?`;

	const noteIDsWithTag = `
	SELECT note_tags.note_id AS id
	FROM note_tags
	WHERE note_tags.tag_id IN (${tagIDs})`;

	const requiredTags = terms.filter(x => x.name === 'tag' && !x.negated);
	const excludedTags = terms.filter(x => x.name === 'tag' && x.negated);

	if (requiredTags.length > 0) {
		filterByTableName(requiredTags, conditions, params, relation, noteIDsWithTag, Requirement.INCLUSION, withs, tableName, useFTS);
	}

	if (excludedTags.length > 0) {
		filterByTableName(excludedTags, conditions, params, relation, noteIDsWithTag, Requirement.EXCLUSION, withs, tableName, useFTS);
	}
};

const genericFilter = (terms: Term[], conditions: string[], params: string[], relation: Relation, fieldName: string, useFTS: boolean) => {
	if (fieldName === 'iscompleted' || fieldName === 'type') {
		// Faster query when values can only take two distinct values
		biConditionalFilter(terms, conditions, relation, fieldName, useFTS);
		return;
	}

	const tableName = useFTS ? 'notes_normalized' : 'notes';

	const getCondition = (term: Term) => {
		if (fieldName === 'sourceurl') {
			return `${tableName}.source_url ${term.negated ? 'NOT' : ''} LIKE ?`;
		} else if (fieldName === 'date' && term.name === 'due') {
			return `todo_due ${term.negated ? '<' : '>='} ?`;
		} else if (fieldName === 'id') {
			return `id ${term.negated ? 'NOT' : ''} LIKE ?`;
		} else {
			return `${tableName}.${fieldName === 'date' ? `user_${term.name}_time` : `${term.name}`} ${term.negated ? '<' : '>='} ?`;
		}
	};

	terms.forEach(term => {
		conditions.push(`
		${relation} ( ${term.name === 'due' ? 'is_todo IS 1 AND ' : ''} ROWID IN (
			SELECT ROWID
			FROM ${tableName}
			WHERE ${getCondition(term)}
		))`);
		params.push(term.value);
	});
};

const biConditionalFilter = (terms: Term[], conditions: string[], relation: Relation, filterName: string, useFTS: boolean) => {
	const getCondition = (filterName: string , value: string, relation: Relation) => {
		const tableName = useFTS ? (relation === 'AND' ? 'notes_fts' : 'notes_normalized') : 'notes';
		if (filterName === 'type') {
			return `${tableName}.is_todo IS ${value === 'todo' ? 1 : 0}`;
		} else if (filterName === 'iscompleted') {
			return `${tableName}.is_todo IS 1 AND ${tableName}.todo_completed IS ${value === '1' ? 'NOT 0' : '0'}`;
		} else {
			throw new Error('Invalid filter name.');
		}
	};

	const values = terms.map(x => x.value);

	// AND and OR are handled differently because FTS restricts how OR can be used.
	values.forEach(value => {
		if (relation === 'AND') {
			conditions.push(`
			AND ${getCondition(filterName, value, relation)}`);
		}
		if (relation === 'OR') {
			if (useFTS) {
				conditions.push(`
				OR ROWID IN (
					SELECT ROWID
					FROM notes_normalized
					WHERE ${getCondition(filterName, value, relation)}
				)`);
			} else {
				conditions.push(`
				OR ${getCondition(filterName, value, relation)}`);
			}
		}
	});
};

const noteIdFilter = (terms: Term[], conditions: string[], params: string[], relation: Relation, useFTS: boolean) => {
	const noteIdTerms = terms.filter(x => x.name === 'id');
	genericFilter(noteIdTerms, conditions, params, relation, 'id', useFTS);
};


const typeFilter = (terms: Term[], conditions: string[], params: string[], relation: Relation, useFTS: boolean) => {
	const typeTerms = terms.filter(x => x.name === 'type');
	genericFilter(typeTerms, conditions, params, relation, 'type', useFTS);
};

const completedFilter = (terms: Term[], conditions: string[], params: string[], relation: Relation, useFTS: boolean) => {
	const completedTerms = terms.filter(x => x.name === 'iscompleted');
	genericFilter(completedTerms, conditions, params, relation, 'iscompleted', useFTS);
};


const locationFilter = (terms: Term[], conditons: string[], params: string[], relation: Relation, useFTS: boolean) => {
	const locationTerms = terms.filter(x => x.name === 'latitude' || x.name === 'longitude' || x.name === 'altitude');
	genericFilter(locationTerms, conditons, params, relation, 'location', useFTS);
};

const dateFilter = (terms: Term[], conditons: string[], params: string[], relation: Relation, useFTS: boolean) => {
	const getUnixMs = (date: string): string => {
		const yyyymmdd = /^[0-9]{8}$/;
		const yyyymm = /^[0-9]{6}$/;
		const yyyy = /^[0-9]{4}$/;
		const smartValue = /^(day|week|month|year)(\+|-)([0-9]+)$/i;

		if (yyyymmdd.test(date)) {
			return time.formatLocalToMs(date, 'YYYYMMDD').toString();
		} else if (yyyymm.test(date)) {
			return time.formatLocalToMs(date, 'YYYYMM').toString();
		} else if (yyyy.test(date)) {
			return time.formatLocalToMs(date, 'YYYY').toString();
		} else if (smartValue.test(date)) {
			const match = smartValue.exec(date);
			const timeUnit = match[1]; // eg. day, week, month, year
			const timeDirection = match[2]; // + or -
			const num = Number(match[3]); // eg. 1, 12, 15

			if (timeDirection === '+') { return time.goForwardInTime(Date.now(), num, timeUnit); } else { return time.goBackInTime(Date.now(), num, timeUnit); }
		} else {
			throw new Error('Invalid date format!');
		}
	};

	const dateTerms = terms.filter(x => x.name === 'created' || x.name === 'updated' || x.name === 'due');
	const unixDateTerms = dateTerms.map(term => { return { ...term, value: getUnixMs(term.value) }; });
	genericFilter(unixDateTerms, conditons, params, relation, 'date', useFTS);
};

const sourceUrlFilter = (terms: Term[], conditons: string[], params: string[], relation: Relation, useFTS: boolean) => {
	const urlTerms = terms.filter(x => x.name === 'sourceurl');
	genericFilter(urlTerms, conditons, params, relation, 'sourceurl', useFTS);
};

const trimQuotes = (str: string) => str.startsWith('"') && str.endsWith('"') ? str.substr(1, str.length - 2) : str;

const textFilter = (terms: Term[], conditions: string[], params: string[], relation: Relation, useFTS: boolean) => {
	const createLikeMatch = (term: Term, negate: boolean) => {
		const query = `${relation} ${negate ? 'NOT' : ''} (
			${(term.name === 'text' || term.name === 'body') ? 'notes.body LIKE ? ' : ''} 
			${term.name === 'text' ? 'OR' : ''} 
			${(term.name === 'text' || term.name === 'title') ? 'notes.title LIKE ? ' : ''})`;

		conditions.push(query);
		const param = `%${trimQuotes(term.value)}%`;
		params.push(param);
		if (term.name === 'text') params.push(param);
	};

	const addExcludeTextConditions = (excludedTerms: Term[], conditions: string[], params: string[], relation: Relation) => {
		if (useFTS) {
			const type = excludedTerms[0].name === 'text' ? '' : `.${excludedTerms[0].name}`;
			if (relation === 'AND') {
				conditions.push(`
												AND ROWID NOT IN (
													SELECT ROWID
													FROM notes_fts
													WHERE notes_fts${type} MATCH ?
												)`);
				params.push(excludedTerms.map(x => x.value).join(' OR '));
			}
			if (relation === 'OR') {
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
																WHERE notes_fts${type} MATCH ?
														)
													)`);
					params.push(term.value);
				});
			}
		} else {
			excludedTerms.forEach(term => {
				createLikeMatch(term, true);
			});
		}
	};

	const allTerms = terms.filter(x => x.name === 'title' || x.name === 'body' || x.name === 'text');

	const includedTerms = allTerms.filter(x => !x.negated);
	if (includedTerms.length > 0) {
		if (useFTS) {
			conditions.push(`${relation} notes_fts MATCH ?`);
			const termsToMatch = includedTerms.map(term => {
				if (term.name === 'text') return term.value;
				else return `${term.name}:${term.value}`;
			});
			const matchQuery = (relation === 'OR') ? termsToMatch.join(' OR ') : termsToMatch.join(' ');
			params.push(matchQuery);
		} else {
			includedTerms.forEach(term => {
				createLikeMatch(term, false);
			});
		}
	}

	const excludedTextTerms = allTerms.filter(x => x.name === 'text' && x.negated);
	const excludedTitleTerms = allTerms.filter(x => x.name === 'title' && x.negated);
	const excludedBodyTerms = allTerms.filter(x => x.name === 'body' && x.negated);

	if ((excludedTextTerms.length > 0)) {
		addExcludeTextConditions(excludedTextTerms, conditions, params, relation);
	}

	if (excludedTitleTerms.length > 0) {
		addExcludeTextConditions(excludedTitleTerms, conditions, params, relation);
	}

	if (excludedBodyTerms.length > 0) {
		addExcludeTextConditions(excludedBodyTerms, conditions, params, relation);
	}
};

const getDefaultRelation = (terms: Term[]): Relation => {
	const anyTerm = terms.find(term => term.name === 'any');
	if (anyTerm) { return (anyTerm.value === '1') ? Relation.OR : Relation.AND; }
	return Relation.AND;
};

const getConnective = (terms: Term[], relation: Relation): string => {
	const notebookTerm = terms.find(x => x.name === 'notebook');
	return (!notebookTerm && (relation === 'OR')) ? 'ROWID=-1' : '1'; // ROWID=-1 acts as 0 (something always false)
};

export default function queryBuilder(terms: Term[], useFTS: boolean) {
	const queryParts: string[] = [];
	const params: string[] = [];
	const withs: string[] = [];

	const relation: Relation = getDefaultRelation(terms);

	if (useFTS) {
		queryParts.push(`
		SELECT
		notes_fts.id,
		notes_fts.title,
		offsets(notes_fts) AS offsets,
		matchinfo(notes_fts, 'pcnalx') AS matchinfo,
		notes_fts.user_created_time,
		notes_fts.user_updated_time,
		notes_fts.is_todo,
		notes_fts.todo_completed,
		notes_fts.parent_id
		FROM notes_fts
		WHERE ${getConnective(terms, relation)}`);
	} else {
		queryParts.push(`
		SELECT
		notes.id,
		notes.title,
		notes.user_created_time,
		notes.user_updated_time,
		notes.is_todo,
		notes.todo_completed,
		notes.parent_id
		FROM notes
		WHERE ${getConnective(terms, relation)}`);
	}

	noteIdFilter(terms, queryParts, params, relation, useFTS);

	notebookFilter(terms, queryParts, params, withs, useFTS);

	tagFilter(terms, queryParts, params, relation, withs, useFTS);

	resourceFilter(terms, queryParts, params, relation, withs, useFTS);

	textFilter(terms, queryParts, params, relation, useFTS);


	typeFilter(terms, queryParts, params, relation, useFTS);

	completedFilter(terms, queryParts, params, relation, useFTS);

	dateFilter(terms, queryParts, params, relation, useFTS);

	locationFilter(terms, queryParts, params, relation, useFTS);

	sourceUrlFilter(terms, queryParts, params, relation, useFTS);

	let query;
	if (withs.length > 0) {
		if (terms.find(x => x.name === 'notebook') && terms.find(x => x.name === 'any')) {
			// The notebook filter should be independent of the any filter.
			// So we're first finding the OR of other filters and then combining them with the notebook filter using AND
			// in-required-notebook AND (condition #1 OR condition #2  OR ... )
			const queryString = `${queryParts.slice(0, 2).join(' ')} AND ROWID IN ( SELECT ROWID FROM notes_fts WHERE 1=0 ${queryParts.slice(2).join(' ')})`;
			query = ['WITH RECURSIVE' , withs.join(',') , queryString].join(' ');
		} else {
			query = ['WITH RECURSIVE' , withs.join(',') ,queryParts.join(' ')].join(' ');
		}
	} else {
		query = queryParts.join(' ');
	}

	return { query, params };
}
