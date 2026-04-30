use crate::one::property::object_reference::ObjectReference;
use crate::one::property::{PropertyType, simple};
use crate::one::property_set::PropertySetId;
use crate::onestore::object::Object;
use crate::shared::exguid::ExGuid;
use parser_utils::errors::Result;
use parser_utils::log_warn;

/// An ink data container.
pub(crate) struct Data {
    pub(crate) strokes: Vec<ExGuid>,
    pub(crate) bounding_box: Option<[i32; 4]>,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::InkDataNode.as_jcid() {
        return Err(unexpected_object_type_error!(object.id().0).into());
    }

    let strokes =
        ObjectReference::parse_vec(PropertyType::InkStrokes, object)?.unwrap_or_else(|| {
            // It seems to be possible for an InkDataNode to have no associated InkStrokes object.
            // See https://discourse.joplinapp.org/t/error-importing-notes-from-onenote/49671
            log_warn!("ink data node {:?} has no strokes", object.id());
            vec![]
        });
    let bounding_box = simple::parse_vec_i32(PropertyType::InkBoundingBox, object)?
        .filter(|values| values.len() == 4)
        .map(|values| [values[0], values[1], values[2], values[3]]);

    Ok(Data {
        strokes,
        bounding_box,
    })
}
