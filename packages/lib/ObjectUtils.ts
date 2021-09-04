export function sortByValue(object: any) {
	const temp = [];
	for (const k in object) {
		if (!object.hasOwnProperty(k)) continue;
		temp.push({
			key: k,
			value: object[k],
		});
	}

	temp.sort(function(a, b) {
		let v1 = a.value;
		let v2 = b.value;
		if (typeof v1 === 'string') v1 = v1.toLowerCase();
		if (typeof v2 === 'string') v2 = v2.toLowerCase();
		if (v1 === v2) return 0;
		return v1 < v2 ? -1 : +1;
	});

	const output: any = {};
	for (let i = 0; i < temp.length; i++) {
		const item = temp[i];
		output[item.key] = item.value;
	}

	return output;
}

export function fieldsEqual(o1: any, o2: any) {
	if ((!o1 || !o2) && o1 !== o2) return false;

	for (const k in o1) {
		if (!o1.hasOwnProperty(k)) continue;
		if (o1[k] !== o2[k]) return false;
	}

	const c1 = Object.getOwnPropertyNames(o1);
	const c2 = Object.getOwnPropertyNames(o2);

	if (c1.length !== c2.length) return false;

	return true;
}

export function convertValuesToFunctions(o: any) {
	const output: any = {};
	for (const n in o) {
		if (!o.hasOwnProperty(n)) continue;
		output[n] = () => {
			return typeof o[n] === 'function' ? o[n]() : o[n];
		};
	}
	return output;
}

export function isEmpty(o: any) {
	if (!o) return true;
	return Object.keys(o).length === 0 && o.constructor === Object;
}

// export function isStringifiable(o:any):boolean {
// 	if (o === null || o === undefined) return true;

// 	if (Array.isArray(o)) {
// 		for (const e of o) {
// 			if (!isStringifiable(e)) return false;
// 		}
// 		return true;
// 	}

// 	if (typeof o === 'object') {

// 	}

// 	return true;
// }
