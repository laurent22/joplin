use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::object::Object;
use crate::parser::reader::Reader;
use crate::parser::shared::guid::Guid;
use crate::parser::utils::Utf16ToString;
use encoding_rs::mem::decode_latin1;

pub(crate) fn parse_bool(prop_type: PropertyType, object: &Object) -> Result<Option<bool>> {
    let value = match object.props().get(prop_type) {
        Some(value) => value.to_bool().ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("bool value is not a bool".into())
        })?,
        None => return Ok(None),
    };

    Ok(Some(value))
}

pub(crate) fn parse_u8(prop_type: PropertyType, object: &Object) -> Result<Option<u8>> {
    let value = match object.props().get(prop_type) {
        Some(value) => value
            .to_u8()
            .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("u8 value is not a u8".into()))?,
        None => return Ok(None),
    };

    Ok(Some(value))
}

pub(crate) fn parse_u16(prop_type: PropertyType, object: &Object) -> Result<Option<u16>> {
    let value = match object.props().get(prop_type) {
        Some(value) => value
            .to_u16()
            .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("u16 value is not a u16".into()))?,
        None => return Ok(None),
    };

    Ok(Some(value))
}

pub(crate) fn parse_u32(prop_type: PropertyType, object: &Object) -> Result<Option<u32>> {
    let value = match object.props().get(prop_type) {
        Some(value) => value
            .to_u32()
            .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("u32 value is not a u32".into()))?,
        None => return Ok(None),
    };

    Ok(Some(value))
}

// Not used at the moment
//
// pub(crate) fn parse_u64(prop_type: PropertyType, object: &Object) -> Result<Option<u64>> {
//     object
//         .props()
//         .get(prop_type)
//         .map(|value| {
//             value
//                 .to_u64()
//                 .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("u64 value is not a u64".into()))
//         })
//         .transpose()
//         .map_err(|e| e.into())
// }

pub(crate) fn parse_f32(prop_type: PropertyType, object: &Object) -> Result<Option<f32>> {
    let value = match object.props().get(prop_type) {
        Some(value) => value.to_u32().ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("float value is not a u32".into())
        })?,
        None => return Ok(None),
    };

    Ok(Some(f32::from_le_bytes(value.to_le_bytes())))
}

pub(crate) fn parse_vec(prop_type: PropertyType, object: &Object) -> Result<Option<Vec<u8>>> {
    let data = match object.props().get(prop_type) {
        Some(value) => value
            .to_vec()
            .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("vec value is not a vec".into()))?,
        None => return Ok(None),
    };

    Ok(Some(data.to_vec()))
}

pub(crate) fn parse_vec_u16(prop_type: PropertyType, object: &Object) -> Result<Option<Vec<u16>>> {
    let data = match object.props().get(prop_type) {
        Some(value) => value.to_vec().ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("vec u16 value is not a vec".into())
        })?,
        None => return Ok(None),
    };

    let vec = data
        .chunks_exact(2)
        .map(|v| u16::from_le_bytes([v[0], v[1]]))
        .collect();

    Ok(Some(vec))
}

pub(crate) fn parse_vec_u32(prop_type: PropertyType, object: &Object) -> Result<Option<Vec<u32>>> {
    let data = match object.props().get(prop_type) {
        Some(value) => value
            .to_vec()
            .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("vec value is not a vec".into()))?,
        None => return Ok(None),
    };

    let vec = data
        .chunks_exact(4)
        .map(|v| u32::from_le_bytes([v[0], v[1], v[2], v[3]]))
        .collect();

    Ok(Some(vec))
}

pub(crate) fn parse_ascii(prop_type: PropertyType, object: &Object) -> Result<Option<String>> {
    let data = match object.props().get(prop_type) {
        Some(value) => value.to_vec().ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("ascii value is not a vec".into())
        })?,
        None => return Ok(None),
    };

    let text = decode_latin1(data).to_string();

    Ok(Some(text))
}

pub(crate) fn parse_string(prop_type: PropertyType, object: &Object) -> Result<Option<String>> {
    let data = match object.props().get(prop_type) {
        Some(value) => value
            .to_vec()
            .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("vec value is not a vec".into()))?,
        None => return Ok(None),
    };

    let text = data
        .utf16_to_string()
        .map_err(|_| ErrorKind::MalformedOneNoteFileData("invalid string".into()))?;

    Ok(Some(text))
}

pub(crate) fn parse_guid(prop_type: PropertyType, object: &Object) -> Result<Option<Guid>> {
    let data = match object.props().get(prop_type) {
        Some(value) => value
            .to_vec()
            .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("guid value is not a vec".into()))?,
        None => return Ok(None),
    };

    Ok(Some(Guid::parse(&mut Reader::new(data))?))
}
