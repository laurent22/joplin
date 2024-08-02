use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::cell_id::CellId;
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::object_reference::ObjectReference;
use crate::parser::one::property::object_space_reference::ObjectSpaceReference;
use crate::parser::one::property::time::Timestamp;
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;
use crate::parser::shared::guid::Guid;

/// A page series.
///
/// See [\[MS-ONE\] 2.2.18].
///
/// [\[MS-ONE\] 2.2.18]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/e2957d3b-a2a8-4756-8662-4e67fefa9f4e
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct Data {
    pub(crate) entity_guid: Guid,
    pub(crate) page_spaces: Vec<CellId>,
    pub(crate) page_metadata: Vec<ExGuid>,
    pub(crate) created_at: Option<Timestamp>, // FIXME: Force this?
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::PageSeriesNode.as_jcid() {
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
    }

    let entity_guid = simple::parse_guid(PropertyType::NotebookManagementEntityGuid, object)?
        .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("page series has no guid".into()))?;
    let page_spaces =
        ObjectSpaceReference::parse_vec(PropertyType::ChildGraphSpaceElementNodes, object)?
            .unwrap_or_default();
    let page_metadata =
        ObjectReference::parse_vec(PropertyType::MetaDataObjectsAboveGraphSpace, object)?
            .unwrap_or_default();
    let created_at = Timestamp::parse(PropertyType::TopologyCreationTimeStamp, object)?;

    let data = Data {
        entity_guid,
        page_spaces,
        page_metadata,
        created_at,
    };

    Ok(data)
}
