use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::object::Object;
use crate::parser::reader::Reader;

#[derive(Debug, Clone)]
pub struct OutlineIndentDistance(Vec<f32>);

impl OutlineIndentDistance {
    pub fn value(&self) -> &[f32] {
        &self.0
    }

    pub(crate) fn into_value(self) -> Vec<f32> {
        self.0
    }

    pub(crate) fn parse(object: &Object) -> Result<Option<OutlineIndentDistance>> {
        let value = match object.props().get(PropertyType::RgOutlineIndentDistance) {
            Some(value) => value.to_vec().ok_or_else(|| {
                ErrorKind::MalformedOneNoteFileData("outline indent distance is not a vec".into())
            })?,
            None => return Ok(None),
        };

        let mut reader = Reader::new(value);
        let count = reader.get_u8()?;
        reader.advance(3)?;

        let distances = (0..count)
            .map(|_| reader.get_f32())
            .collect::<Result<Vec<_>>>()?;

        Ok(Some(OutlineIndentDistance(distances)))
    }
}
