use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::object::Object;
use crate::parser::reader::Reader;
use crate::parser::shared::guid::Guid;

/// The dimensions (X or Y) for an ink stoke with lower and upper limits.
#[allow(dead_code)]
pub(crate) struct InkDimension {
    pub(crate) id: Guid,
    pub(crate) limit_lower: i32,
    pub(crate) limit_upper: i32,
}

impl InkDimension {
    pub(crate) fn parse(prop_type: PropertyType, object: &Object) -> Result<Vec<InkDimension>> {
        let data = match object.props().get(prop_type) {
            Some(value) => value.to_vec().ok_or_else(|| {
                ErrorKind::MalformedOneNoteFileData("ink dimensions is not a vec".into())
            })?,
            None => return Ok(Vec::new()),
        };

        data.chunks_exact(32)
            .map(InkDimension::parse_entry)
            .collect::<Result<Vec<_>>>()
    }

    fn parse_entry(data: &[u8]) -> Result<InkDimension> {
        let mut reader = Reader::new(data);
        let id = Guid::parse(&mut reader)?;
        let limit_lower = reader.get_u32()? as i32;
        let limit_upper = reader.get_u32()? as i32;

        Ok(InkDimension {
            id,
            limit_lower,
            limit_upper,
        })
    }
}
