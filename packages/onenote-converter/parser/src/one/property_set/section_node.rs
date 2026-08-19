use std::rc::Rc;

use crate::one::property::object_reference::ObjectReference;
use crate::one::property::time::Timestamp;
use crate::one::property::{PropertyType, simple};
use crate::one::property_set::PropertySetId;
use crate::onestore::object::Object;
use crate::shared::exguid::ExGuid;
use crate::shared::guid::Guid;
use parser_utils::errors::Result;
use parser_utils::log_warn;

/// A section.
///
/// See [\[MS-ONE\] 2.2.23].
///
/// [\[MS-ONE\] 2.2.23]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/980fae36-b5dd-4581-bf1e-5ab54177153d
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct Data {
    //pub(crate) context_id: ExGuid, // Removed -- but may be necessary
    /// Used for creating links to sections. If not present, defaults to `Guid::nil`.
    pub(crate) entity_guid: Guid,
    pub(crate) page_series: Vec<ExGuid>,
    pub(crate) created_at: Timestamp,
}

pub(crate) fn parse(object: Rc<Object>) -> Result<Data> {
    if object.id() != PropertySetId::SectionNode.as_jcid() {
        return Err(unexpected_object_type_error!(object.id().0).into());
    }

    //let context_id = object.context_id();

    let object = object.as_ref();
    let entity_guid = simple::parse_guid(PropertyType::NotebookManagementEntityGuid, object)?
        .unwrap_or_else(|| {
            log_warn!("Section: Missing entity GUID");
            Guid::nil()
        });
    let page_series =
        ObjectReference::parse_vec(PropertyType::ElementChildNodes, object)?.unwrap_or_default();
    let created_at = Timestamp::parse(PropertyType::TopologyCreationTimeStamp, object)?
        .ok_or_else(|| parser_error!(MalformedOneNoteData, "Section has no creation timestamp"))?;

    let data = Data {
        //context_id,
        entity_guid,
        page_series,
        created_at,
    };

    Ok(data)
}
