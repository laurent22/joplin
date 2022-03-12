const preprocessor = {
	// Open the details tag
	openDetailsTags: (htmlData: string): string => {

		// Check if the file has the details tag
		if (!htmlData.includes('</details>')) return htmlData;

		// Check if it details tag is already open
		const regex = /<details(.*?) open[ >](.*?)/g;
		if (regex.test(htmlData)) return htmlData;

		// Open the details tag and return the data
		return htmlData.replace(/<details/g, '<details open ');

	},
};
export default preprocessor;
