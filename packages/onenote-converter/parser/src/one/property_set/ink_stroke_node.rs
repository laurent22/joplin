use crate::one::property::object_reference::ObjectReference;
use crate::one::property::{PropertyType, simple};
use crate::one::property_set::PropertySetId;
use crate::onestore::object::Object;
use crate::shared::exguid::ExGuid;
use crate::shared::multi_byte;
use parser_utils::errors::{ErrorKind, Result};
use parser_utils::log_warn;

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
        return Err(unexpected_object_type_error!(object.id().0).into());
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
            0 => InkBias::Handwriting,
            1 => InkBias::Drawing,
            2 => InkBias::Both,
            _i => InkBias::Both,
        })
        .unwrap_or_else(|| {
            log_warn!("No InkBias was set. Using default value 'Both'");
            return InkBias::Both;
        });
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
