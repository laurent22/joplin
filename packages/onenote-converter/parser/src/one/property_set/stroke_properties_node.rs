use crate::one::property::ink_dimensions::InkDimension;
use crate::one::property::{PropertyType, simple};
use crate::one::property_set::PropertySetId;
use crate::onestore::object::Object;
use parser_utils::errors::{ErrorKind, Result};

/// An ink stroke's properties.
#[allow(dead_code)]
pub(crate) struct Data {
    // pub(crate) aliased: bool,
    // pub(crate) fit_to_curve: bool,
    pub(crate) ignore_pressure: bool,
    pub(crate) pen_tip: Option<u8>,
    pub(crate) raster_operation: Option<u8>,
    pub(crate) transparency: Option<u8>,
    pub(crate) ink_height: f32,
    pub(crate) ink_width: f32,
    pub(crate) color: Option<u32>,
    pub(crate) dimensions: Vec<InkDimension>,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::StrokePropertiesNode.as_jcid() {
        return Err(unexpected_object_type_error!(object.id().0).into());
    }

    // TODO: add support for aliased
    // let aliased = simple::parse_bool(PropertyType::InkAntialised, object)?.unwrap_or_default();
    // let fit_to_curve = simple::parse_bool(PropertyType::InkFitToCurve, object)?.unwrap_or_default();
    let ignore_pressure =
        simple::parse_bool(PropertyType::InkIgnorePressure, object)?.unwrap_or_default();
    let pen_tip = simple::parse_u8(PropertyType::InkPenTip, object)?;
    let raster_operation = simple::parse_u8(PropertyType::InkRasterOperation, object)?;
    let transparency = simple::parse_u8(PropertyType::InkTransparency, object)?;
    let ink_width = simple::parse_f32(PropertyType::InkHeight, object)?.ok_or_else(|| {
        ErrorKind::MalformedOneNoteFileData("ink stroke properties has no height".into())
    })?;
    let ink_height = simple::parse_f32(PropertyType::InkWidth, object)?.ok_or_else(|| {
        ErrorKind::MalformedOneNoteFileData("ink stroke properties has no width".into())
    })?;
    let color = simple::parse_u32(PropertyType::InkColor, object)?;
    let dimensions = InkDimension::parse(PropertyType::InkDimensions, object)?;

    Ok(Data {
        // aliased,
        // fit_to_curve,
        ignore_pressure,
        pen_tip,
        raster_operation,
        transparency,
        ink_height,
        ink_width,
        color,
        dimensions,
    })
}
