import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import * as fs from 'fs';
import * as cheerio from 'cheerio';
export interface AIHistory {
	id: string;
	text: string; isUser: boolean;
	loading?: boolean;
}

const embeddings = new OpenAIEmbeddings({
	model: 'text-embedding-3-large',
	openAIApiKey: process.env.JOPLIN_OAI_KEY });


// 保存済みのFAISSインデックスをロードする関数

const loadVectorStore = async (indexPath: string) => {


	// FAISSインデックスが存在するかチェック
	if (!fs.existsSync(indexPath)) {
		console.log(
			'FAISSインデックスが見つかりません。先にembedding.tsを実行してください。'
		);
		return null;
	}

	try {
		console.log('FAISSインデックスをロードしています...');
		const vectorStore = await FaissStore.load(indexPath, embeddings);
		console.log('FAISSインデックスのロードが完了しました');
		return vectorStore;
	} catch (error) {
		console.error('FAISSインデックスのロード中にエラーが発生しました:', error);
		return null;
	}
};

export const ragSendMessage = async (question: string, dbPath: string, replyId: string, histories: Array<AIHistory>, replyFunc: (msg: string, id?: string, loading?: boolean)=> string) => {
	const model = new ChatOpenAI({ model: 'gpt-4o', apiKey: process.env.JOPLIN_OAI_KEY });
	const vectorStore = await loadVectorStore(dbPath);
	if (!vectorStore) {
		replyFunc('ナレッジベースが見つかりませんでした。', replyId);
		return;
	}

	const historyMessages = histories.flatMap(h => {
		if (!h.text) return [];
		return h.isUser
			? [new HumanMessage(h.text)]
			: [new AIMessage(h.text)];
	});
	console.log(`\n質問: ${question}`);

	// 関連するドキュメントを検索
	console.log('\n関連ドキュメントを検索中...');
	replyFunc('関連ドキュメントを検索中...', replyId, true);
	const relevantDocs = await vectorStore.similaritySearch(question, 10);
	console.log(`${relevantDocs.length}件の関連ドキュメントが見つかりました`);

	// 関連ドキュメントの内容を結合
	const context = relevantDocs
		.map((doc, _index) => `${JSON.stringify({ documentId: _index, document: doc })}`)
		.join('\n\n');


	const systemPromptEvidence = `あなたは親切で正確なアシスタントです。
提供されたコンテキスト情報を基に、ユーザーの質問に日本語で回答してください。
ただし、回答自体は生成せず、回答根拠となるdocumentIdだけを回答してください。
回答根拠が見当たらない場合は、空文字を返してください。
コンテキスト情報:
${context}`;



	const messages = [
		new SystemMessage(systemPromptEvidence),
		...historyMessages,
		new HumanMessage(question),
	];

	const evidencePath = await model.invoke(messages);
	console.log(`evidence documentId: ${evidencePath.content}`);


	const contentPath = evidencePath.content ? relevantDocs[Number(evidencePath.content)].metadata.filePath : '';
	let fileContent = contentPath ? fs.readFileSync(contentPath, 'utf-8') : '';
	const $ = cheerio.load(fileContent);

	// h1要素を検索し、idがあればinnerTextの末尾に (fragment_id: xxxx) を追加
	$('h1').each((_, elem) => {
		const id = $(elem).attr('id');
		if (id) {
			const text = $(elem).text();
			$(elem).text(`${text} (fragment_id: ${id})`);
		}
	});
	fileContent = $.html();


	// システムプロンプトとユーザーメッセージを作成
	const systemPromptAnswer = `あなたは親切で正確なアシスタントです。
	提供されたコンテキスト情報を基に、ユーザーの質問に日本語で回答してください。
	コンテキストに答えがない場合は、「提供された情報では回答できません」と答えてください。
	回答時のフォーマットはmarkdownでお願いします。
	回答時には回答の根拠となったsourceとそのnoteIdをリンクとして表示してください。
	その際、noteIdはjoplinスキームとしてリンクしてください。
	加えて回答の根拠となった箇所を含むhtmlタグのidを抽出しfragmentジャンプをできるようにしてください。
	例えば、根拠: [{source}](joplin://{noteId}#{id})のように表示してください。
	

	コンテキスト情報:
	${fileContent}`;

	const messagesAnswer = [
		new SystemMessage(systemPromptAnswer),
		...historyMessages,
		new HumanMessage(question),
	];

	replyFunc('回答を生成中...', replyId, true);
	// LLMに質問して回答を生成
	let response = '';
	const stream = await model.stream(messagesAnswer);
	for await (const chunk of stream) {
		const content = typeof chunk.content === 'string' ? chunk.content : '';
		response += content;
		replyFunc(response, replyId);
	}

	return response;
};

const sendMessage = async (question: string, replyId: string, histories: Array<AIHistory>, replyFunc: (msg: string, id?: string)=> string) => {
	const model = new ChatOpenAI({ model: 'gpt-4o', apiKey: process.env.JOPLIN_OAI_KEY });
	const historyMessages = histories.flatMap(h => {
		if (!h.text) return [];
		return h.isUser
			? [new HumanMessage(h.text)]
			: [new AIMessage(h.text)];
	});
	const messages = [
		new SystemMessage('なるべく丁寧に回答して下さい。'),
		...historyMessages,
		new HumanMessage(question),
	];

	let response = '';
	const stream = await model.stream(messages);
	for await (const chunk of stream) {
		const content = typeof chunk.content === 'string' ? chunk.content : '';
		response += content;
		replyFunc(response, replyId);
	}

	return response;
};

export default sendMessage;
