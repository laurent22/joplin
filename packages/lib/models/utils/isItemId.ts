export default (id: string) => {
	return id.match(/^[0-9a-zA-Z]{32}$/);
};
