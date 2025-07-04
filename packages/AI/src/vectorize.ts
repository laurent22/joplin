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


// eslint-disable-next-line import/prefer-default-export
export const vectorizeDocuments = async (srcFolderPath: string, faissDBPath: string) => {
	const documentPath = srcFolderPath;

	// documentフォルダが存在するかチェック
	if (!fs.existsSync(documentPath)) {
		console.log('documentフォルダが見つかりません');
		return;
	}

	// HTMLファイルを取得
	const files = fs
		.readdirSync(documentPath)
		.filter(file => file.endsWith('.html'));

	if (files.length === 0) {
		console.log('HTMLファイルが見つかりません');
		return;
	}

	console.log(`${files.length}個のHTMLファイルを処理します`);

	const allDocuments = [];

	// 各HTMLファイルを処理
	for (const file of files) {
		const filePath = path.join(documentPath, file);

		try {
			// HTMLファイルを直接読み込み
			const htmlContent = fs.readFileSync(filePath, 'utf-8');

			// // CheerioでHTMLを解析してテキストを抽出
			// const $ = cheerio.load(htmlContent);

			// // scriptとstyleタグを除去
			// $('script, style').remove();

			// // テキストコンテンツを抽出
			// const textContent = $('body').text() || $.text();

			// Documentオブジェクトを作成
			const doc = new Document({
				pageContent: htmlContent, // ここではHTML全体をpageContentに設定,
				metadata: {
					source: file,
					filePath: filePath,
				},
			});

			allDocuments.push(doc);
			console.log(`${file} を読み込みました`);
		} catch (error) {
			console.error(`${file} の処理中にエラーが発生しました:`, error);
		}
	}

	if (allDocuments.length === 0) {
		console.log('処理可能なドキュメントがありませんでした');
		return false;
	}

	// テキストを分割
	console.log('テキストを分割しています...');
	const splitDocs = await textSplitter.splitDocuments(allDocuments);
	console.log(`${splitDocs.length}個のチャンクに分割しました`);

	// ベクトルストアを作成
	console.log('ベクトル化してFAISSに格納しています...');
	const vectorStore = await FaissStore.fromDocuments(splitDocs, embeddings);

	// FAISSインデックスを保存
	const indexPath = faissDBPath;
	await vectorStore.save(indexPath);
	console.log(`FAISSインデックスを ${indexPath} に保存しました`);

	return true;
};
