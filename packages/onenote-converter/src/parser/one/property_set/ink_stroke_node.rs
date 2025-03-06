use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::object_reference::ObjectReference;
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;
use crate::parser::shared::multi_byte;
use crate::utils::utils::log_warn;

/// An ink stroke.
#[allow(dead_code)]
pub(crate) struct Data {
    pub(crate) path: Vec<i64>,
    pub(crate) bias: InkBias,
    pub(crate) language_code: Option<u32>,
    pub(crate) properties: ExGuid,
}

pub(crate) enum InkBias {
    Handwriting,
    Drawing,
    Both,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::InkStrokeNode.as_jcid() {
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
    }

    let path = simple::parse_vec(PropertyType::InkPath, object)?
        .map(|data| multi_byte::decode_signed(&data))
        .ok_or_else(|| {
            log_warn!("ink stroke node has no ink path");
            Vec::<i64>::new()
            // ErrorKind::MalformedOneNoteFileData("ink stroke node has no ink path".into())
        })
        .unwrap();
    let bias = simple::parse_u8(PropertyType::InkBias, object)?
        .map(|bias| match bias {
            0 => Ok(InkBias::Handwriting),
            1 => Ok(InkBias::Drawing),
            2 => Ok(InkBias::Both),
            i => Err(ErrorKind::MalformedOneNoteFileData(
                format!("invalid ink bias value: {}", i).into(),
            )),
        })
        .transpose()?
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("ink stroke node has no ink bias".into())
        })?;
    let language_code = simple::parse_u32(PropertyType::LanguageId, object)?;
    let properties = ObjectReference::parse(PropertyType::InkStrokeProperties, object)?
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData(
                "ink stroke node has no ink stroke properties".into(),
            )
        })?;

    let data = Data {
        path,
        bias,
        language_code,
        properties,
    };

    Ok(data)
}
