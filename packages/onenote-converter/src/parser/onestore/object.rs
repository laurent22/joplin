use super::types::prop_set::PropertySet;
use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::fsshttpb::data_element::object_group::ObjectGroupData;
use crate::parser::fsshttpb::packaging::OneStorePackaging;
use crate::parser::onestore::mapping_table::MappingTable;
use crate::parser::onestore::object_space::GroupData;
use crate::parser::onestore::types::jcid::JcId;
use crate::parser::onestore::types::object_prop_set::ObjectPropSet;
use crate::parser::reader::Reader;

/// A OneNote data object.
///
/// See [\[MS-ONESTOR\] 2.1.5] and [\[MS-ONESTOR\] 2.7.6]
///
/// [\[MS-ONESTOR\] 2.1.5]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/ce60b62f-82e5-401a-bf2c-3255457732ad
/// [\[MS-ONESTOR\] 2.7.6]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/b4270940-827e-468b-bf42-2c7afee23740
#[derive(Debug, Clone)]
pub(crate) struct Object<'a> {
    pub(crate) context_id: ExGuid,

    pub(crate) jc_id: JcId,
    pub(crate) props: ObjectPropSet,
    pub(crate) file_data: Option<&'a [u8]>,
    pub(crate) mapping: MappingTable,
}

#[derive(Debug, Copy, Clone)]
enum Partition {
    Metadata = 4,
    ObjectData = 1,
    FileData = 2,
}

impl<'a> Object<'a> {
    pub(crate) fn id(&self) -> JcId {
        self.jc_id
    }

    pub(crate) fn context_id(&self) -> ExGuid {
        self.context_id
    }

    pub(crate) fn props(&self) -> &ObjectPropSet {
        &self.props
    }

    pub(crate) fn file_data(&self) -> Option<&[u8]> {
        self.file_data.as_deref()
    }

    pub(crate) fn mapping(&self) -> &MappingTable {
        &self.mapping
    }
}

impl<'a> Object<'a> {
    pub fn fallback() -> Object<'a> {
        return Object {
            jc_id: JcId { 0: 0 },
            context_id: ExGuid::fallback(),
            file_data: None,
            mapping: MappingTable::fallback(),
            props: ObjectPropSet {
                object_ids: Vec::from([]),
                object_space_ids: Vec::from([]),
                context_ids: Vec::from([]),
                properties: PropertySet::fallback(),
            },
        };
    }

    pub(crate) fn parse<'b>(
        object_id: ExGuid,
        context_id: ExGuid,
        object_space_id: ExGuid,
        objects: &'b GroupData,
        packaging: &'a OneStorePackaging,
    ) -> Result<Object<'a>> {
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

        Ok(Object {
            context_id,
            jc_id,
            props,
            file_data,
            mapping,
        })
    }

    fn find_object<'b>(
        id: ExGuid,
        partition_id: Partition,
        objects: &'b GroupData,
    ) -> Option<&'b ObjectGroupData> {
        objects.get(&(id, partition_id as u64)).cloned()
    }

    fn find_blob_id(id: ExGuid, objects: &'a GroupData) -> Result<Option<ExGuid>> {
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
