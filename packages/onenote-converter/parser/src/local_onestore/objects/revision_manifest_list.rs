use std::{collections::HashMap, rc::Rc};

use crate::{
    local_onestore::{
        file_node::{FileNodeData, file_node::RevisionManifestListStartFND},
        file_structure::FileNodeDataIterator,
        objects::{parse_context::ParseContext, revision::Revision},
    },
    shared::exguid::ExGuid,
};
use parser_utils::{
    errors::{ErrorKind, Result},
    log_warn,
};

#[derive(Debug)]
pub struct RevisionManifestList {
    pub revisions: Vec<Rc<Revision>>,
}

impl RevisionManifestList {
    pub fn try_parse(
        iterator: &mut FileNodeDataIterator,
        context: &ParseContext,
    ) -> Result<Option<Self>> {
        let next = iterator.peek();

        match next {
            Some(FileNodeData::RevisionManifestListStartFND(list_reference)) => {
                iterator.next();
                Ok(Some(Self::parse(iterator, list_reference, context)?))
            }
            _ => Ok(None),
        }
    }

    fn parse(
        iterator: &mut FileNodeDataIterator,
        _list_reference: &RevisionManifestListStartFND,
        context: &ParseContext,
    ) -> Result<Self> {
        let mut revisions = Vec::new();
        // Also create a temporary map to simplify revision lookup while building
        let mut revisions_map: HashMap<ExGuid, _> = HashMap::new();

        let mut last_index = iterator.get_index();
        while let Some(current) = iterator.peek() {
            match current {
                FileNodeData::RevisionManifestEndFND => {
                    break;
                }
                FileNodeData::RevisionRoleDeclarationFND(_data) => {
                    // Ignore. If present, should always have revision_role = 0x1?
                    iterator.next();
                }
                FileNodeData::RevisionRoleAndContextDeclarationFND(data) => {
                    // Adds an additional (revision role, context) pair to some prior revision
                    // in the list.
                    // See [MS-ONESTORE 2.5.18](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/4863b0e8-fe14-49bb-a634-558c747bf0b8).
                    let revision = revisions_map.get(&data.base.rid);
                    if let Some(_revision) = revision {
                        iterator.next();
                        // TODO: Find a test .one file that uses this and implement:
                        log_warn!("TO-DO: Apply the new role and context to the revision");
                    } else {
                        return Err(
                            ErrorKind::MalformedOneStoreData("RevisionRoleAndContextDeclarationFND points to a non-existent revision".into()).into()
                        );
                    }
                }
                node => {
                    let revision = Revision::try_parse(iterator, context)?.ok_or_else(|| {
                        onestore_parse_error!(
                            "Unexpected node encountered in RevisionManifestList: {:?}",
                            node
                        )
                    })?;
                    let revision_ref = Rc::new(revision);
                    revisions.push(revision_ref.clone());
                    revisions_map.insert(revision_ref.id, revision_ref);
                }
            }

            let index = iterator.get_index();
            assert_ne!(index, last_index);
            last_index = index;
        }
        Ok(RevisionManifestList { revisions })
    }
}
