import Setting from '../models/Setting';

interface Script {
	exec: ()=> Promise<void>;
}

const script: Script = <Script>{};

script.exec = async () => {
	Setting.setValue('markdown.plugin.softbreaks', Setting.value('markdown.softbreaks'));
	Setting.setValue('markdown.plugin.typographer', Setting.value('markdown.typographer'));
};

export default script;
