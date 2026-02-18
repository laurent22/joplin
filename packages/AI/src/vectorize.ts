/* eslint-disable complexity */
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

const CHUNK_SIZE = 7000;

// テキスト分割器を設定
const textSplitter = new RecursiveCharacterTextSplitter({
	chunkSize: CHUNK_SIZE,
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

const extractFragmentIdandSetIt = ($: cheerio.Root) => {
	// h1, h2, h3要素を検索し、idがあればinnerTextの末尾に (fragment_id: xxxx) を追加
	['h1', 'h2', 'h3'].forEach(tag => {
		$(tag).each((_, elem) => {
			const id = $(elem).attr('id');
			if (id) {
				const text = $(elem).text();
				$(elem).text(`${text} (fragment_id:${id})`);
			}
		});
	});
	return $;
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
		// xxxx/yyyy_{noteId}.html 形式から noteId と yyyy.html を抽出
		const match = filePath.match(/(.+)[\\/](.+)_([a-f0-9]{32})\.html$/);
		let noteId = '';
		let file = '';
		let title = '';
		if (match) {
			noteId = match[3];
			file = `${match[2]}.html`;
			title = match[2];
		} else {
			file = path.basename(filePath);
		}

		try {
			const htmlContent = fs.readFileSync(filePath, 'utf-8');

			// CheerioでHTMLを解析してテキストを抽出
			let $ = cheerio.load(htmlContent);
			$ = extractFragmentIdandSetIt($);
			$('script, style').remove();
			const textContent = $('body').text() || $.root().text();

			// テキストを分割
			const splitTexts = await textSplitter.splitText(textContent);

			// チャンクごとにDocumentを作成
			for (const chunk of splitTexts) {
				const titledChunk = JSON.stringify({ title, content: chunk });
				const source = title || file;
				
				// CHUNK_SIZEを超える場合は強制的に分割
				if (titledChunk.length > CHUNK_SIZE) {
					// JSON化のオーバーヘッドを計算
					const jsonOverhead = JSON.stringify({ title, content: '' }).length;
					const maxContentLength = CHUNK_SIZE - jsonOverhead;
					
					// chunkを maxContentLength ごとに分割
					for (let i = 0; i < chunk.length; i += maxContentLength) {
						const subChunk = chunk.substring(i, i + maxContentLength);
						const subTitledChunk = JSON.stringify({ title, content: subChunk });
						const doc = new Document({
							pageContent: subTitledChunk,
							metadata: {
								source: source,
								filePath: filePath,
								noteId: noteId,
							},
						});
						allDocuments.push(doc);
					}
				} else {
					const doc = new Document({
						pageContent: titledChunk,
						metadata: {
							source: source,
							filePath: filePath,
							noteId: noteId,
						},
					});
					allDocuments.push(doc);
				}
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
