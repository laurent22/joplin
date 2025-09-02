import Setting from '@joplin/lib/models/Setting';

const getResourceBaseUrl = () => `joplin-content://note-viewer/${Setting.value('resourceDir')}/`;
export default getResourceBaseUrl;
