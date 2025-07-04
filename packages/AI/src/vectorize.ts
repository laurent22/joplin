import { OpenAIEmbeddings } from '@langchain/openai';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

const embeddings = new OpenAIEmbeddings({
	model: 'text-embedding-3-large',
	openAIApiKey: process.env.JOPLIN_OAI_KEY });

// テキスト分割器を設定
const textSplitter = new RecursiveCharacterTextSplitter({
	chunkSize: 8000,
	chunkOverlap: 200,
});



const divideDocument = (allDocs: Document<{
  source: string;
  filePath: string;
}>[]): Document<{
  source: string;
  filePath: string;
}>[][] => {
	const MAX_CHARS = 250000;
	const result: Document<{ source: string; filePath: string }>[] [] = [];
	let currentBatch: Document<{ source: string; filePath: string }>[] = [];
	let currentCharCount = 0;
	for (const doc of allDocs) {
		const len = doc.pageContent ? doc.pageContent.length : 0;
		if (currentCharCount + len > MAX_CHARS && currentBatch.length > 0) {
			result.push(currentBatch);
			currentBatch = [];
			currentCharCount = 0;
		}
		currentBatch.push(doc);
		currentCharCount += len;
	}
	if (currentBatch.length > 0) {
		result.push(currentBatch);
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
			const $ = cheerio.load(htmlContent);
			$('script, style').remove();
			const textContent = $('body').text() || $.root().text();

			// テキストを分割
			const splitTexts = await textSplitter.splitText(textContent);

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
