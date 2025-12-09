use crate::{
    local_onestore::{
        file_node::{FileNodeData, file_node::ObjectGroupListReferenceFND},
        file_structure::FileNodeDataIterator,
        objects::{global_id_table::GlobalIdTable, object::Object, parse_context::ParseContext},
    },
    shared::exguid::ExGuid,
};
use parser_utils::{errors::Result, log};
use std::fmt::Debug;
use std::rc::Rc;

/// See [MS-ONESTORE 2.1.13](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/607a84d4-5762-4a3e-9244-c91acddcf647)
pub struct ObjectGroupList {
    id: ExGuid,
    pub id_table: GlobalIdTable,
    pub objects: Vec<Rc<Object>>,
}

impl Debug for ObjectGroupList {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        // Don't include all fields -- avoid duplicate data in output
        f.debug_struct("ObjectGroupList")
            .field("id", &self.id)
            .field("objects", &self.objects)
            .finish()
    }
}

impl ObjectGroupList {
    pub fn try_parse(
        iterator: &mut FileNodeDataIterator,
        context: &ParseContext,
    ) -> Result<Option<Self>> {
        let current = iterator.peek();
        if let Some(FileNodeData::ObjectGroupListReferenceFND(data)) = current {
            iterator.next();
            Ok(Some(Self::from_reference(data, context)?))
        } else if let Some(FileNodeData::ObjectGroupStartFND(_)) = current {
            Ok(Some(Self::parse(iterator, context)?))
        } else {
            Ok(None)
        }
    }

    fn from_reference(
        reference: &ObjectGroupListReferenceFND,
        context: &ParseContext,
    ) -> Result<Self> {
        let mut iterator = reference.list.iter_data();
        Self::parse(&mut iterator, context)
    }

    fn parse(iterator: &mut FileNodeDataIterator, context: &ParseContext) -> Result<Self> {
        let start = match iterator.next() {
            Some(FileNodeData::ObjectGroupStartFND(object)) => object,
            _ => {
                return Err(onestore_parse_error!(
                    "Object group lists must start with an ObjectGroupStartFND node."
                )
                .into());
            }
        };
        let id = start.oid;
        let id_table = GlobalIdTable::try_parse(iterator)?
            .ok_or_else(|| onestore_parse_error!("Global ID table not found in ObjectGroupList"))?;
        let mut objects = Vec::new();

        let parse_context = context.with_id_table(&id_table);

        let mut last_index = iterator.get_index();
        while let Some(item) = iterator.peek() {
            if matches!(item, FileNodeData::ObjectGroupEndFND) {
                break;
            } else if let FileNodeData::DataSignatureGroupDefinitionFND(_) = item {
                iterator.next();
                log!("Ignoring DataSignatureGroupDefinitionFND");
            } else if let Some(object) = Object::try_parse(iterator, &parse_context)? {
                objects.push(Rc::new(object));
            } else {
                return Err(onestore_parse_error!(
                    "Unexpected node in ObjectGroupList: {:?}",
                    item
                )
                .into());
            }

            let index = iterator.get_index();
            assert_ne!(index, last_index);
            last_index = index;
        }

        Ok(Self {
            id,
            id_table,
            objects,
        })
    }

    pub fn from_objects(objects: Vec<Rc<Object>>, id_table: GlobalIdTable) -> Self {
        Self {
            id: ExGuid::fallback(),
            id_table,
            objects,
        }
    }
}
