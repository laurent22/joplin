
let idCounter = 0;

const createUniqueId = () => {
	return `__joplin-id-${idCounter++}`;
};

export default createUniqueId;
