use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property_set::iframe_node;
use crate::parser::onestore::object_space::ObjectSpace;

/// An embedded iframe.
#[derive(Clone, PartialEq, PartialOrd, Debug)]
pub struct IFrame {
    pub(crate) embed_type: Option<u32>,
    pub(crate) source_url: String,
}

impl IFrame {
    pub fn embed_type(&self) -> Option<u32> {
        self.embed_type
    }
    pub fn source_url(&self) -> &str {
        &self.source_url
    }
}

pub(crate) fn parse_iframe(iframe_id: ExGuid, space: &ObjectSpace) -> Result<IFrame> {
    let object = space
        .get_object(iframe_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("image is missing".into()))?;
    let data = iframe_node::parse(object)?;

    Ok(IFrame {
        embed_type: data.embed_type,
        source_url: data.source_url,
    })
}
