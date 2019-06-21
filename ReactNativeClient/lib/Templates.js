const Setting = require('./models/Setting.js');
const BaseModel = require('./BaseModel.js');
const Tag = require('./models/Tag.js');
const Note = require('./models/Note.js');
const Folder = require('./models/Folder.js');
const { _ } = require('./locale.js');
const moment = require('moment');


const Templates = {
  anger : {
    title : () => ( "Anger "+moment().format('MMMM Do YYYY, h:mm:ss a') ),
    tags : ['anger'],
    folder : 'keep',
    body : 'Why was I angry?'
  },
  daily : {
    title : () => ( "Quotidien "+moment().format('dddd MMMM Do YYYY') ),
    tags : ['q'],
    folder : 'Todo',
    isTodo : true,
    body :  async () => {
      let day = moment().format('dddd');
      const folder = await Folder.loadByTitle('DayLists');
      let searchParams = {
        conditions : [`parent_id = '${folder.id}'`]
      }
      const tNotes = await Note.search(searchParams);
      for (let t in tNotes){
        if (tNotes[t].title === day) return tNotes[t].body
      }
      return "- [ ] Relax!";
    }
  }

};

const resolve_it = async(val) => {

  if (typeof val === 'function'){
    let temp = val()
    if (val instanceof Promise){
      return await val.call(this)
    }
    else {
      return temp;
    }
  }else {
    return val
  }
}

const createCustom = async (template) => {

  let fName = await resolve_it(template.folder);
  let tNames = await resolve_it(template.tags);
  let noteTitle = await resolve_it(template.title);
  let noteBody = await resolve_it(template.body);
  let isTodo = await resolve_it(template.isTodo);
  let folderId = Setting.value('activeFolderId');

  if (fName != null) {
    const folder = await Folder.loadByTitle(fName);
    folderId = folder.id;
  }

  if (!folderId) return;

  let note = {
    title: noteTitle,
    parent_id: folderId,
    is_todo: isTodo != null && isTodo
  };

  if (noteBody)  note.body = noteBody;

  let tags = new Array(tNames.length)
  for (let t = 0; t < tags.length;t++){
    tags[t] = await Tag.loadByTitle(tNames[t]);
    if (tags[t] === null){
      return;
    }
  }

  let newNote = await Note.save(note);
  console.log('note id: '+newNote.id)
  Note.updateGeolocation(newNote.id);

  for (let t = 0; t < tags.length;t++){
    await Tag.addNote(tags[t].id, newNote.id);
  }

  return newNote;
}

const noteFromTemplate = async (templateName) => {
  const template = Templates[templateName]
  if (!template) return;

  return await createCustom(template)
}

module.exports = { noteFromTemplate };
