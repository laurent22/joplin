use crate::one::property::object_reference::ObjectReference;
use crate::one::property::time::Time;
use crate::one::property::{PropertyType, simple};
use crate::one::property_set::PropertySetId;
use crate::onestore::object::Object;
use crate::shared::exguid::ExGuid;
use parser_utils::errors::Result;

/// An ink container.
#[allow(dead_code)]
pub(crate) struct Data {
    pub(crate) offset_from_parent_horiz: Option<f32>,
    pub(crate) offset_from_parent_vert: Option<f32>,
    pub(crate) last_modified: Option<Time>,
    pub(crate) ink_data: Option<ExGuid>,
    pub(crate) ink_scaling_x: Option<f32>,
    pub(crate) ink_scaling_y: Option<f32>,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::InkContainer.as_jcid() {
        return Err(unexpected_object_type_error!(object.id().0).into());
    }

    let last_modified = Time::parse(PropertyType::LastModifiedTime, object)?;
    let offset_from_parent_horiz = simple::parse_f32(PropertyType::OffsetFromParentHoriz, object)?;
    let offset_from_parent_vert = simple::parse_f32(PropertyType::OffsetFromParentVert, object)?;
    let ink_data = ObjectReference::parse(PropertyType::InkData, object)?;
    let ink_scaling_x = simple::parse_f32(PropertyType::InkScalingX, object)?;
    let ink_scaling_y = simple::parse_f32(PropertyType::InkScalingX, object)?;

    let data = Data {
        offset_from_parent_horiz,
        offset_from_parent_vert,
        last_modified,
        ink_data,
        ink_scaling_x,
        ink_scaling_y,
    };

    Ok(data)
}
