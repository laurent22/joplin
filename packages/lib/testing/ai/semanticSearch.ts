import Setting from '../../models/Setting';
import AiService from '../../services/ai/AiService';
import EmbeddingIndexer from '../../services/ai/EmbeddingIndexer';
import TestEmbeddingProvider from '../../services/ai/testing/TestEmbeddingProvider';
import SearchEngine from '../../services/search/SearchEngine';

export const setUpSemanticSearch = async () => {
	AiService.instance().setEmbeddingProvider(new TestEmbeddingProvider());
	Setting.setValue('featureFlag.enableSemanticSearch', true);
};

export const tearDownSemanticSearch = async () => {
	await EmbeddingIndexer.instance().stopRunInBackground();
};

export const updateSearchIndex = async () => {
	await EmbeddingIndexer.instance().maintenance();
	await SearchEngine.instance().syncTables();
};
