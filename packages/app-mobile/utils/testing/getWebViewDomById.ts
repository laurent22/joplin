import getWebViewWindowById from './getWebViewWindowById';

const getWebViewDomById = async (id: string): Promise<Document> => {
	return (await getWebViewWindowById(id)).document;
};

export default getWebViewDomById;
