use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::time::Timestamp;
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;
use crate::parser::shared::guid::Guid;

/// A page's metadata.
///
/// See [\[MS-ONE\] 2.2.30].
///
/// [\[MS-ONE\] 2.2.30]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/aaabcc70-5836-4dcb-8209-012ce5d45b3c
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct Data {
    pub(crate) entity_guid: Guid,
    pub(crate) cached_title: String,
    pub(crate) schema_revision_in_order_to_read: Option<u32>, // FIXME: Force this?
    pub(crate) schema_revision_in_order_to_write: Option<u32>, // FIXME: Force this?
    pub(crate) page_level: i32,
    pub(crate) created_at: Timestamp,
    pub(crate) is_deleted: bool,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::PageMetadata.as_jcid() {
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
    }

    let entity_guid = simple::parse_guid(PropertyType::NotebookManagementEntityGuid, object)?
        .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("page metadata has no guid".into()))?;
    // The page might not have a title but we can use the first Section outline from the body as the fallback later
    let cached_title = simple::parse_string(PropertyType::CachedTitleString, object)?
        .ok_or_else(|| {
            let guid = simple::parse_guid(PropertyType::NotebookManagementEntityGuid, object);
            return guid.map(|g| g.unwrap().to_string());
        })
        .unwrap_or("Untitled Page".to_string());
    let schema_revision_in_order_to_read =
        simple::parse_u32(PropertyType::SchemaRevisionInOrderToRead, object)?;
    let schema_revision_in_order_to_write =
        simple::parse_u32(PropertyType::SchemaRevisionInOrderToWrite, object)?;
    let page_level = simple::parse_u32(PropertyType::PageLevel, object)?.unwrap_or(0) as i32;
    let created_at = Timestamp::parse(PropertyType::TopologyCreationTimeStamp, object)?
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("page metadata has no creation timestamp".into())
        })?;
    let is_deleted =
        simple::parse_bool(PropertyType::IsDeletedGraphSpaceContent, object)?.unwrap_or_default();

    let data = Data {
        entity_guid,
        cached_title,
        schema_revision_in_order_to_read,
        schema_revision_in_order_to_write,
        page_level,
        created_at,
        is_deleted,
    };

    Ok(data)
}
