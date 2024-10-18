use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data_element::object_group::{ObjectGroup, ObjectGroupData};
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::types::object_prop_set::ObjectPropSet;
use crate::parser::onestore::types::property::PropertyValue;
use crate::parser::reader::Reader;
use crate::parser::shared::guid::Guid;

/// A OneStore file's header data.
///
/// See [\[MS-ONESTORE\] 2.7.2]
///
/// [\[MS-ONESTORE\] 2.7.2]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/07a5dc4d-0d97-4a4c-ab69-aa7957d7115c
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct StoreHeader {
    file_identity: Guid,
    ancestor_identity: Guid,
    last_code_version_that_wrote_to_it: Option<u32>,
    file_name_crc: u32,
}

impl StoreHeader {
    pub(crate) fn parse(data: &ObjectGroup) -> Result<StoreHeader> {
        let (_, object_data) = data
            .declarations
            .iter()
            .zip(data.objects.iter())
            .find(|(decl, _)| decl.partition_id() == 1)
            .ok_or_else(|| ErrorKind::MalformedOneStoreData("object data is missing".into()))?;

        let object_data = if let ObjectGroupData::Object { data, .. } = object_data {
            data
        } else {
            return Err(ErrorKind::MalformedOneStoreData(
                "object group data it not an object".into(),
            )
            .into());
        };

        let prop_set = ObjectPropSet::parse(&mut Reader::new(object_data.as_slice()))?;

        let file_identity = prop_set
            .get(PropertyType::FileIdentityGuid)
            .map(|value| StoreHeader::parse_guid(value))
            .transpose()?
            .ok_or_else(|| {
                ErrorKind::MalformedOneStoreData("FileIdentityGuid prop missing".into())
            })?;

        let ancestor_identity = prop_set
            .get(PropertyType::FileAncestorIdentityGuid)
            .map(|value| StoreHeader::parse_guid(value))
            .transpose()?
            .ok_or_else(|| {
                ErrorKind::MalformedOneStoreData("FileAncestorIdentityGuid prop missing".into())
            })?;

        let last_code_version_that_wrote_to_it = prop_set
            .get(PropertyType::FileLastCodeVersionThatWroteToIt)
            .map(|value| StoreHeader::parse_u32(value))
            .transpose()?;

        let file_name_crc = prop_set
            .get(PropertyType::FileNameCrc)
            .map(|value| StoreHeader::parse_u32(value))
            .transpose()?
            .ok_or_else(|| ErrorKind::MalformedOneStoreData("FileNameCRC prop missing".into()))?;

        Ok(StoreHeader {
            file_identity,
            ancestor_identity,
            last_code_version_that_wrote_to_it,
            file_name_crc,
        })
    }

    fn parse_guid(value: &PropertyValue) -> Result<Guid> {
        if let PropertyValue::Vec(data) = &value {
            Ok(Guid::parse(&mut Reader::new(data.as_slice()))?)
        } else {
            Err(ErrorKind::MalformedOneStoreData("property is not a vec".into()).into())
        }
    }

    fn parse_u32(value: &PropertyValue) -> Result<u32> {
        if let PropertyValue::U32(v) = value {
            Ok(*v)
        } else {
            Err(ErrorKind::MalformedOneStoreData("property is not a vec".into()).into())
        }
    }
}
