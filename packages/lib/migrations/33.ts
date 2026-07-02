import SearchEngine from '../services/search/SearchEngine';

interface Script {
	exec: ()=> Promise<void>;
}

const script: Script = <Script>{};

script.exec = async () => {
	await SearchEngine.instance().rebuildIndex();
};

export default script;
