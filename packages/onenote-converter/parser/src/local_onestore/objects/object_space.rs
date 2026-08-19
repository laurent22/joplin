use std::{collections::HashMap, rc::Rc};

use crate::{
    local_onestore::{
        file_node::{FileNodeData, file_node::ObjectSpaceManifestListReferenceFND},
        file_structure::FileNodeDataIterator,
        objects::{
            object::Object, parse_context::ParseContext, revision::Revision,
            revision_manifest_list::RevisionManifestList,
        },
    },
    shared::exguid::ExGuid,
};
use parser_utils::errors::{ErrorKind, Result};

type ExportedObject = crate::onestore::object::Object;

/// A collection of objects, referenced from the root file node list.
///
/// See [\[MS-ONESTORE\] 2.1.4](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/1329433f-02a5-4e83-ab41-80d57ade38d9)
#[derive(Debug)]
pub struct ObjectSpace {
    pub id: ExGuid,
    pub revision_list: RevisionManifestList,
    pub id_to_object: HashMap<ExGuid, Rc<Object>>,
    pub id_to_revision: HashMap<ExGuid, Rc<Revision>>,
}

impl ObjectSpace {
    pub fn try_parse(
        iterator: &mut FileNodeDataIterator,
        context: &ParseContext,
    ) -> Result<Option<Self>> {
        let next = iterator.peek();

        match next {
            Some(FileNodeData::ObjectSpaceManifestListReferenceFND(list_reference)) => {
                iterator.next();
                Ok(Some(Self::parse(iterator, list_reference, context)?))
            }
            _ => Ok(None),
        }
    }

    fn parse(
        _iterator: &mut FileNodeDataIterator,
        list_reference: &ObjectSpaceManifestListReferenceFND,
        context: &ParseContext,
    ) -> Result<Self> {
        let id = list_reference.gosid;
        let context = &context.with_context_id(id);
        let mut list_iterator = list_reference.last_revision.list.iter_data();
        let revision_list = RevisionManifestList::try_parse(&mut list_iterator, context)?;
        let revision_list = revision_list.ok_or_else(|| {
            ErrorKind::MalformedOneStoreData(
                "ObjectSpace should point to a RevisionManifestList".into(),
            )
        })?;
        let mut result = Self {
            id,
            revision_list,
            id_to_object: HashMap::new(),
            id_to_revision: HashMap::new(),
        };
        result.index_content()?;
        Ok(result)
    }

    fn index_content(&mut self) -> Result<()> {
        for revision in &self.revision_list.revisions {
            // TODO: Use global_id_tables if present. This may be required for parsing
            //      .onetoc2 files, which allow references from one ID table to another.
            let _global_id_tables = &revision.global_id_tables;

            for object_group in &revision.object_groups {
                let id_table = &object_group.id_table;
                for object_ref in &object_group.objects {
                    let id = id_table.resolve_id(&object_ref.compact_id)?;
                    self.id_to_object.insert(id, object_ref.clone());
                }
            }
            self.id_to_revision.insert(revision.id, revision.clone());
        }
        Ok(())
    }
}

impl crate::onestore::object_space::ObjectSpace for ObjectSpace {
    fn get_object(&self, id: ExGuid) -> Option<Rc<ExportedObject>> {
        self.id_to_object.get(&id).map(|result| result.data.clone())
    }

    fn content_root(&self) -> Option<ExGuid> {
        self.revision_list
            .revisions
            .iter()
            // TODO: It would make more sense to use the **last** revision, rather than
            //       the first to get the content root. However, doing so seems to return
            //       version history information, rather than the true content root.
            //       In the future, if there are issues related to importing the wrong versions
            //       of pages, look into this.
            // .rev()
            .find_map(|revision| revision.content_root())
    }

    fn metadata_root(&self) -> Option<ExGuid> {
        self.revision_list
            .revisions
            .iter()
            // .rev() // TODO: Why does calling .rev() result in the wrong metadata being returned?
            .find_map(|revision| revision.metadata_root())
    }
}
