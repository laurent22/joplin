use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property_set::toc_container;
use crate::parser::onenote::section::SectionEntry;
use crate::parser::onestore::object_space::ObjectSpace;
use itertools::Itertools;

/// A OneNote notebook.
#[derive(Clone, Debug)]
pub struct Notebook {
    pub(crate) entries: Vec<SectionEntry>,
}

impl Notebook {
    /// The section entries of this notebook.
    pub fn entries(&self) -> &[SectionEntry] {
        &self.entries
    }
}

pub(crate) fn parse_toc(space: &ObjectSpace) -> Result<Vec<String>> {
    let content_id = space
        .content_root()
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("notebook has no content root".into()))?;

    let toc = parse_toc_entry(content_id, space)?
        .into_iter()
        .sorted_by_key(|(ordering_id, _)| *ordering_id)
        .dedup_by(|(_, a), (_, b)| a == b)
        .map(|(_, name)| name)
        .collect();

    Ok(toc)
}

fn parse_toc_entry(content_id: ExGuid, space: &ObjectSpace) -> Result<Vec<(u32, String)>> {
    let content = space.get_object(content_id).ok_or_else(|| {
        ErrorKind::MalformedOneNoteData("notebook content root is missing".into())
    })?;

    let toc = toc_container::parse(content)?;

    if let Some(name) = toc.filename {
        let ordering_id = toc
            .ordering_id
            .ok_or_else(|| ErrorKind::MalformedOneNoteData("section has no order id".into()))?;

        Ok(vec![(ordering_id, name)])
    } else {
        let children = toc
            .children
            .into_iter()
            .map(|content_id| parse_toc_entry(content_id, space))
            .collect::<Result<Vec<_>>>()?
            .into_iter()
            .flatten()
            .collect();

        Ok(children)
    }
}
