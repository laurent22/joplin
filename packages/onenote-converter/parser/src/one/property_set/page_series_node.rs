use crate::one::property::object_reference::ObjectReference;
use crate::one::property::object_space_reference::ObjectSpaceReference;
use crate::one::property::time::Timestamp;
use crate::one::property::{PropertyType, simple};
use crate::one::property_set::PropertySetId;
use crate::onestore::object::Object;
use crate::shared::cell_id::CellId;
use crate::shared::exguid::ExGuid;
use crate::shared::guid::Guid;
use parser_utils::errors::Result;
use parser_utils::log_warn;

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
        return Err(unexpected_object_type_error!(object.id().0).into());
    }

    let entity_guid = simple::parse_guid(PropertyType::NotebookManagementEntityGuid, object)?
        .unwrap_or_else(|| {
            log_warn!("page series has no guid");
            return Guid::nil();
        });
    let page_spaces =
        ObjectSpaceReference::parse_vec(PropertyType::ChildGraphSpaceElementNodes, object)?
            .unwrap_or_default();
    let page_metadata =
        ObjectReference::parse_vec(PropertyType::MetaDataObjectsAboveGraphSpace, object)?
            .unwrap_or_default()
            .into_iter()
            // This must be xored with a seed value:
            //  { 0x22a8c031, 0x3600, 0x42ee, { 0xb7, 0x14, 0xd7, 0xac, 0xda, 0x24, 0x35, 0xe8 } }
            // As per [\[MS-ONE\] 2.2.18] and an analysis of the spec in comments in https://github.com/alegrigoriev/onenote2xml/,
            // this corresponds to "{22a8c031-3600-42ee-b714-d7acda2435e8}".
            .map(|item| item ^ exguid!({"{22a8c031-3600-42ee-b714-d7acda2435e8}", 0}))
            .collect();
    let created_at = Timestamp::parse(PropertyType::TopologyCreationTimeStamp, object)?;

    let data = Data {
        entity_guid,
        page_spaces,
        page_metadata,
        created_at,
    };

    Ok(data)
}
