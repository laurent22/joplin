use std::{
    collections::HashMap,
    convert::{TryFrom, TryInto},
    rc::Rc,
};

use super::object_group_list::ObjectGroupList;
use crate::{
    local_onestore::{
        file_node::FileNodeData,
        file_structure::FileNodeDataIterator,
        objects::{global_id_table::GlobalIdTable, object::Object, parse_context::ParseContext},
    },
    shared::exguid::ExGuid,
};
use parser_utils::log;
use parser_utils::{
    errors::{Error, Result},
    log_warn,
};

/// See [MS-ONESTORE 2.1.9](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/90101e91-2f7f-4753-9332-31bed5b5c49d)
#[derive(Debug)]
pub struct Revision {
    pub id: ExGuid,
    _parent_id: ExGuid,
    pub object_groups: Vec<ObjectGroupList>,
    pub global_id_tables: Vec<GlobalIdTable>,
    root_objects: HashMap<RootRole, ExGuid>,
}

// See [MS-ONE 2.1.8](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-one/037e31c0-4484-4a14-819a-0ddece2cacbc) 
#[derive(Eq, PartialEq, Hash, Debug)]
pub enum RootRole {
    DefaultContent,
    MetadataRoot,
    VersionMetadataRoot,
}

impl TryFrom<u32> for RootRole {
    type Error = Error;
    fn try_from(value: u32) -> std::result::Result<Self, Self::Error> {
        match value {
            1 => Ok(Self::DefaultContent),
            2 => Ok(Self::MetadataRoot),
            4 => Ok(Self::VersionMetadataRoot),
            other => Err(onestore_parse_error!("Invalid root role: {}", other).into()),
        }
    }
}

impl Revision {
    pub fn try_parse(
        iterator: &mut FileNodeDataIterator,
        context: &ParseContext,
    ) -> Result<Option<Self>> {
        let next = iterator.peek();

        match next {
            Some(
                FileNodeData::RevisionManifestStart4FND(_)
                | FileNodeData::RevisionManifestStart6FND(_)
                | FileNodeData::RevisionManifestStart7FND(_),
            ) => Ok(Some(Self::parse(iterator, context)?)),
            _ => Ok(None),
        }
    }

    pub fn content_root(&self) -> Option<ExGuid> {
        self.root_objects.get(&RootRole::DefaultContent).copied()
    }

    pub fn metadata_root(&self) -> Option<ExGuid> {
        self.root_objects.get(&RootRole::MetadataRoot).copied()
    }

    fn parse(iterator: &mut FileNodeDataIterator, context: &ParseContext) -> Result<Self> {
        let start = iterator.next();
        let (id, parent_id) = match start {
            Some(FileNodeData::RevisionManifestStart4FND(data)) => (data.rid, data.rid_dependent),
            Some(FileNodeData::RevisionManifestStart6FND(data)) => (data.rid, data.rid_dependent),
            Some(FileNodeData::RevisionManifestStart7FND(data)) => {
                (data.base.rid, data.base.rid_dependent)
            }
            _ => {
                return Err(
                    onestore_parse_error!("Invalid start node for revision: {:?}", start).into(),
                );
            }
        };

        let mut object_groups = Vec::new();
        let mut global_id_tables = Vec::new();
        let mut root_objects: HashMap<RootRole, ExGuid> = HashMap::new();

        let mut last_index = iterator.get_index();
        while let Some(current) = iterator.peek() {
            if let FileNodeData::RevisionManifestEndFND = current {
                iterator.next();
                break;
            } else if let Some(object_group_list) = ObjectGroupList::try_parse(iterator, context)? {
                // Skip: Used for reference counting (which we can ignore here)
                iterator_skip_if_matching!(
                    iterator,
                    Some(FileNodeData::ObjectInfoDependencyOverridesFND(_))
                );

                object_groups.push(object_group_list);
            } else if let Some(global_id_table) = GlobalIdTable::try_parse(iterator)? {
                // In .onetoc2 files, objects can directly follow GlobalIdTables:
                let mut objects = Vec::new();
                iterator_skip_if_matching!(
                    iterator,
                    Some(FileNodeData::DataSignatureGroupDefinitionFND(_))
                );
                while let Some(object) = Object::try_parse(iterator, context)? {
                    objects.push(Rc::new(object));

                    // Skip the reference counting object, if present
                    iterator_skip_if_matching!(
                        iterator,
                        Some(FileNodeData::ObjectInfoDependencyOverridesFND(_))
                    );
                }

                if !objects.is_empty() {
                    // .onetoc2 only
                    object_groups.push(ObjectGroupList::from_objects(
                        objects,
                        global_id_table.clone(),
                    ));
                }
                global_id_tables.push(global_id_table);
            } else if let FileNodeData::RootObjectReference3FND(object_reference) = current {
                iterator.next(); // Consume the reference

                let root_role: RootRole = object_reference.root_role.try_into()?;
                if root_objects.contains_key(&root_role) {
                    log_warn!("An item with role {:?} is already present", root_role);
                }

                root_objects.insert(root_role, object_reference.oid_root);
            } else if let FileNodeData::RootObjectReference2FNDX(object_reference) = current {
                // .onetoc2
                iterator.next();
                let oid_root = global_id_tables.last().ok_or_else(
                    || onestore_parse_error!("Unable to resolve RootObjectReference2FNDX ID -- no global ID table found")
                )?.resolve_id(&object_reference.oid_root)?;
                root_objects.insert(object_reference.root_role.try_into()?, oid_root);
            } else if let FileNodeData::DataSignatureGroupDefinitionFND(_) = current {
                // .onetoc2
                log!("Ignoring DataSignatureGroupDefinitionFND");
                iterator.next();
            } else {
                return Err(onestore_parse_error!(
                    "Unexpected node (parsing Revision): {:?}",
                    current
                )
                .into());
            }

            // Prevent infinite loops
            let current_index = iterator.get_index();
            assert_ne!(last_index, current_index);
            last_index = current_index;
        }

        Ok(Revision {
            id,
            _parent_id: parent_id,
            object_groups,
            global_id_tables,
            root_objects,
        })
    }
}
