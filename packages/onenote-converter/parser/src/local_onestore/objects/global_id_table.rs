use std::collections::HashMap;

use crate::{
    local_onestore::{
        file_node::FileNodeData, file_structure::FileNodeDataIterator,
        objects::id_mapping::IdMapping,
    },
    shared::{compact_id::CompactId, exguid::ExGuid},
};
use parser_utils::{errors::Result, log_warn};

/// Lower-level structure for mapping local `CompactId`s to global `ExGuid`s. Applies to a
/// particular region of a OneStore file.
///
/// In `.onetoc2` files, `GlobalIdTable`s may depend on other `GlobalIdTable`s.
///
/// See [\[MS-ONESTORE\] 2.1.3](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/a243bd78-6cfd-4e18-96c7-e8c2095ce6b0)
#[derive(Debug, Clone)]
pub struct GlobalIdTable {
    pub id_map: IdMapping,
    /// Only used in .onetoc2 files
    _reference_map: IdReferenceMapping,
}

impl GlobalIdTable {
    pub fn try_parse(iterator: &mut FileNodeDataIterator) -> Result<Option<Self>> {
        let next = iterator.peek();

        match next {
            Some(
                FileNodeData::GlobalIdTableStart2FND | FileNodeData::GlobalIdTableStartFNDX(_),
            ) => Ok(Some(GlobalIdTable::parse(iterator)?)),
            _ => Ok(None),
        }
    }

    fn parse(iterator: &mut FileNodeDataIterator) -> Result<Self> {
        // Skip the start node
        iterator.next();

        let mut id_map = IdMapping::new();
        let mut reference_map = IdReferenceMapping::new();

        for node in iterator {
            match node {
                FileNodeData::GlobalIdTableEndFNDX => {
                    break;
                }
                FileNodeData::GlobalIdTableEntryFNDX(entry) => {
                    id_map.add_mapping(entry.index, entry.guid);
                }
                FileNodeData::GlobalIdTableEntry2FNDX(entry) => {
                    reference_map
                        .parent_references
                        .insert(entry.i_index_map_from, entry.i_index_map_to);
                }
                FileNodeData::GlobalIdTableEntry3FNDX(_entry) => {
                    todo!("Not implemented");
                }
                FileNodeData::UnknownNode(node) => {
                    log_warn!(
                        "Unknown node {:?} skipped while parsing global ID table.",
                        node
                    );
                }
                _ => {
                    return Err(onestore_parse_error!(
                        "Unexpected node ({:?}) encountered while parsing global ID table",
                        node
                    )
                    .into());
                }
            }
        }

        Ok(Self {
            id_map,
            _reference_map: reference_map,
        })
    }

    pub fn fallback() -> Self {
        let id_map = IdMapping::new();
        let reference_map = IdReferenceMapping::new();
        Self {
            id_map,
            _reference_map: reference_map,
        }
    }

    pub fn resolve_id(&self, id: &CompactId) -> Result<ExGuid> {
        self.id_map.resolve_id(id)
    }
}

#[derive(Clone)]
struct IdReferenceMapping {
    /// Maps from indexes in dependency revisions to indexes in the current revision.
    parent_references: HashMap<u32, u32>,
}

impl std::fmt::Debug for IdReferenceMapping {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[IdReferenceMapping]")
    }
}

impl IdReferenceMapping {
    fn new() -> Self {
        Self {
            parent_references: HashMap::new(),
        }
    }
}
