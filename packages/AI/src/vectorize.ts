import { OpenAIEmbeddings } from '@langchain/openai';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import * as fs from 'fs';
import * as path from 'path';
// import * as cheerio from 'cheerio';

const embeddings = new OpenAIEmbeddings({
	model: 'text-embedding-3-large',
	openAIApiKey: process.env.JOPLIN_OAI_KEY });

// テキスト分割器を設定
const textSplitter = new RecursiveCharacterTextSplitter({
	chunkSize: 10000,
	chunkOverlap: 200,
});


// 保存済みのFAISSインデックスをロードする関数

// const loadVectorStore = async () => {
// 	const indexPath = './faiss_index';

// 	// FAISSインデックスが存在するかチェック
// 	if (!fs.existsSync(indexPath)) {
// 		console.log(
// 			'FAISSインデックスが見つかりません。先にembedding.tsを実行してください。'
// 		);
// 		return null;
// 	}

// 	try {
// 		console.log('FAISSインデックスをロードしています...');
// 		const vectorStore = await FaissStore.load(indexPath, embeddings);
// 		console.log('FAISSインデックスのロードが完了しました');
// 		return vectorStore;
// 	} catch (error) {
// 		console.error('FAISSインデックスのロード中にエラーが発生しました:', error);
// 		return null;
// 	}
// };


const divideDocument = (allDocs: Document<{
	source: string;
	filePath: string;
}>[]): Document<{
	source: string;
	filePath: string;
}>[][] => {
	const chunkSize = 20;
	const result: Document<{ source: string; filePath: string }>[] [] = [];
	for (let i = 0; i < allDocs.length; i += chunkSize) {
		result.push(allDocs.slice(i, i + chunkSize));
	}
	return result;
};

// eslint-disable-next-line import/prefer-default-export
export const vectorizeDocuments = async (srcFolderPath: string, faissDBPath: string) => {
	const documentPath = srcFolderPath;

	// documentフォルダが存在するかチェック
	if (!fs.existsSync(documentPath)) {
		console.log('documentフォルダが見つかりません');
		return;
	}

	// フォルダ内の全HTMLファイルを再帰的に取得
	function getAllHtmlFiles(dir: string): string[] {
		let results: string[] = [];
		const list = fs.readdirSync(dir);
		for (const file of list) {
			const filePath = path.join(dir, file);
			const stat = fs.statSync(filePath);
			if (stat && stat.isDirectory()) {
				results = results.concat(getAllHtmlFiles(filePath));
			} else if (file.endsWith('.html')) {
				results.push(filePath);
			}
		}
		return results;
	}

	const files = getAllHtmlFiles(documentPath);

	if (files.length === 0) {
		console.log('HTMLファイルが見つかりません');
		return;
	}

	console.log(`${files.length}個のHTMLファイルを処理します`);

	const allDocuments = [];

	// 各HTMLファイルを処理し、テキストを抽出・分割してDocument化

	for (const filePath of files) {
		const file = path.basename(filePath);

		try {
			const htmlContent = fs.readFileSync(filePath, 'utf-8');
			// CheerioでHTMLを解析してテキストを抽出
			// const $ = cheerio.load(htmlContent);
			// $('script, style').remove();
			// const textContent = $('body').text() || $.text();

			// テキストを分割
			const splitTexts = await textSplitter.splitText(htmlContent);

			// チャンクごとにDocumentを作成
			for (const chunk of splitTexts) {
				const doc = new Document({
					pageContent: chunk,
					metadata: {
						source: file,
						filePath: filePath,
					},
				});
				allDocuments.push(doc);
			}
			console.log(`${file} を読み込み・分割しました`);
		} catch (error) {
			console.error(`${file} の処理中にエラーが発生しました:`, error);
		}
	}

	if (allDocuments.length === 0) {
		console.log('処理可能なドキュメントがありませんでした');
		return false;
	}

	console.log(`${allDocuments.length}個のチャンクをベクトル化します...`);

	const dividedDocuments = divideDocument(allDocuments);

	// ベクトルストアを作成
	const vectorStore = await FaissStore.fromDocuments(dividedDocuments[0], embeddings);
	for (let i = 1; i < dividedDocuments.length; i++) {
		const store = await FaissStore.fromDocuments(dividedDocuments[i], embeddings);
		// storeの全ドキュメントとベクトルをvectorStoreに追加
		await vectorStore.mergeFrom(store);
	}

	// FAISSインデックスを保存
	const indexPath = faissDBPath;
	await vectorStore.save(indexPath);
	console.log(`FAISSインデックスを ${indexPath} に保存しました`);

	return true;
};
