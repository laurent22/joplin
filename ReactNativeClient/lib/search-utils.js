const {unionWith} = require("lodash");

const { Note } = require('lib/models/note.js');


async function  searchNotes(searchString) {
    let allSearchString=searchString.split(' AND ');
    let notes=[];
    for(let i=0;i<allSearchString.length;i++){

        let p = allSearchString[i].split(' ');
        let temp = [];
        for (let j = 0; j < p.length; j++) {
            let t = p[j].trim();
            if (!t) continue;
            temp.push(t);
        }

        notes=unionWith(notes,await Note.previews(null, {
            anywherePattern: '*' + temp.join('*') + '*',
        }),(note1,note2)=>{
            return note1.id===note2.id;
        });
    }



    return notes;
}


module.exports = { searchNotes};