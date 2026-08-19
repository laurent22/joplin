use std::rc::Rc;

use super::packaging::OneStorePackaging;
use crate::fsshttpb::data_element::object_group::ObjectGroupData;
use crate::fsshttpb_onestore::mapping_table::MappingTable;
use crate::fsshttpb_onestore::object_space::GroupData;
use crate::onestore;
use crate::onestore::object::ObjectFileData;
use crate::shared::exguid::ExGuid;
use crate::shared::jcid::JcId;
use crate::shared::object_prop_set::ObjectPropSet;
use parser_utils::errors::{ErrorKind, Result};
use parser_utils::parse::Parse;
use parser_utils::reader::Reader;

type SharedObject = onestore::object::Object;

/// A OneNote data object.
///
/// See [\[MS-ONESTOR\] 2.1.5] and [\[MS-ONESTOR\] 2.7.6]
///
/// [\[MS-ONESTOR\] 2.1.5]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/ce60b62f-82e5-401a-bf2c-3255457732ad
/// [\[MS-ONESTOR\] 2.7.6]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/b4270940-827e-468b-bf42-2c7afee23740
#[derive(Debug, Clone)]
pub(crate) struct Object {
    pub(crate) data: Rc<SharedObject>,
}

#[derive(Debug, Copy, Clone)]
enum Partition {
    Metadata = 4,
    ObjectData = 1,
    FileData = 2,
}

impl Object {
    pub(crate) fn parse(
        object_id: ExGuid,
        context_id: ExGuid,
        object_space_id: ExGuid,
        objects: &GroupData,
        packaging: &OneStorePackaging,
    ) -> Result<Object> {
        let metadata_object = Object::find_object(object_id, Partition::Metadata, objects)
            .ok_or_else(|| ErrorKind::MalformedOneStoreData("object metadata is missing".into()))?;
        let data_object = Object::find_object(object_id, Partition::ObjectData, objects)
            .ok_or_else(|| ErrorKind::MalformedOneStoreData("object data is missing".into()))?;

        // Parse metadata

        let metadata = if let ObjectGroupData::Object { data, .. } = metadata_object {
            data
        } else {
            return Err(ErrorKind::MalformedOneStoreData(
                "object metadata it not an object".into(),
            )
            .into());
        };

        let jc_id = JcId::parse(&mut Reader::new(metadata.as_slice()))?;

        // Parse data

        let (data, object_refs, referenced_cells) =
            if let ObjectGroupData::Object { group, cells, data } = data_object {
                (data, group, cells)
            } else {
                return Err(ErrorKind::MalformedOneStoreData(
                    "object data it not an object".into(),
                )
                .into());
            };

        let props = ObjectPropSet::parse(&mut Reader::new(data.as_slice()))?;

        // Parse file data

        let file_data = Object::find_blob_id(object_id, objects)?
            .map(|blob_id| {
                packaging
                    .data_element_package
                    .find_blob(blob_id)
                    .ok_or_else(|| ErrorKind::MalformedOneStoreData("blob not found".into()))
            })
            .transpose()?;

        let context_refs: Vec<_> = referenced_cells
            .iter()
            .filter(|id| id.1 == object_space_id)
            .map(|id| id.0)
            .collect();

        let object_space_refs: Vec<_> = referenced_cells
            .iter()
            .filter(|id| id.1 != object_space_id)
            .copied()
            .collect();

        if props.object_ids().len() < object_refs.len() {
            return Err(ErrorKind::MalformedOneStoreData(
                "object ref array sizes do not match".into(),
            )
            .into());
        }

        if props.context_ids().len() + props.object_space_ids().len() != referenced_cells.len() {
            return Err(ErrorKind::MalformedOneStoreData(
                "object space/context array sizes do not match".into(),
            )
            .into());
        }

        let mapping_objects = props
            .object_ids()
            .iter()
            .copied()
            .zip(object_refs.iter().copied());

        let mapping_contexts = props.context_ids().iter().copied().zip(context_refs);

        let mapping_object_spaces = props
            .object_space_ids()
            .iter()
            .copied()
            .zip(object_space_refs);

        let mapping = MappingTable::from_entries(
            mapping_objects.chain(mapping_contexts),
            mapping_object_spaces,
        );

        let file_data: Option<Rc<dyn ObjectFileData>> = if let Some(data) = file_data {
            Some(Rc::new(data))
        } else {
            None
        };

        let data = SharedObject {
            context_id,
            jc_id,
            props,
            file_data,
            mapping: Rc::new(mapping),
        };

        Ok(Object {
            data: Rc::new(data),
        })
    }

    fn find_object<'b>(
        id: ExGuid,
        partition_id: Partition,
        objects: &'b GroupData,
    ) -> Option<&'b ObjectGroupData> {
        objects.get(&(id, partition_id as u64)).cloned()
    }

    fn find_blob_id(id: ExGuid, objects: &GroupData) -> Result<Option<ExGuid>> {
        Self::find_object(id, Partition::FileData, objects)
            .map(|object| match object {
                ObjectGroupData::BlobReference { blob, .. } => Ok(*blob),
                _ => {
                    Err(ErrorKind::MalformedOneStoreData("blob object is not a blob".into()).into())
                }
            })
            .transpose()
    }
}
