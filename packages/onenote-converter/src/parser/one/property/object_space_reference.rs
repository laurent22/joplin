use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::cell_id::CellId;
use crate::parser::one::property::references::References;
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::object::Object;
use crate::parser::onestore::types::compact_id::CompactId;
use crate::parser::onestore::types::property::PropertyValue;

/// A generic object space reference.
///
/// This allows for all sorts of object space references (e.g. sections referencing their pages).
/// It implements parsing these references from the OneStore mapping table.
pub(crate) struct ObjectSpaceReference;

impl ObjectSpaceReference {
    pub(crate) fn parse_vec(
        prop_type: PropertyType,
        object: &Object,
    ) -> Result<Option<Vec<CellId>>> {
        // Determine the number of object space references
        let count = match object.props().get(prop_type) {
            Some(prop) => prop.to_object_space_ids().ok_or_else(|| {
                ErrorKind::MalformedOneNoteFileData(
                    "object space reference array is not a object id array".into(),
                )
            })?,
            None => return Ok(None),
        };

        // Determine offset for the property for which we want to look up the object space
        // reference
        let offset = Self::get_offset(prop_type, object)?;

        let references = object.props().object_space_ids();

        // Look up the object space references by offset/count and resolve them
        let object_space_ids = references
            .iter()
            .skip(offset)
            .take(count as usize)
            .enumerate()
            .flat_map(|(index, id)| Self::resolve_id(index, id, object))
            .collect();

        Ok(Some(object_space_ids))
    }

    pub(crate) fn get_offset(prop_type: PropertyType, object: &Object) -> Result<usize> {
        let predecessors = References::get_predecessors(prop_type, object)?;
        let offset = Self::count_references(predecessors);

        Ok(offset)
    }

    pub(crate) fn count_references<'a>(props: impl Iterator<Item = &'a PropertyValue>) -> usize {
        props
            .map(|v| match v {
                PropertyValue::ObjectSpaceId => 1,
                PropertyValue::ObjectSpaceIds(c) => *c as usize,
                PropertyValue::PropertyValues(_, sets) => sets
                    .iter()
                    .map(|set| Self::count_references(set.values()))
                    .sum(),
                _ => 0,
            })
            .sum()
    }

    fn resolve_id(index: usize, id: &CompactId, object: &Object) -> Result<CellId> {
        object
            .mapping()
            .get_object_space(index, *id)
            .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("id not defined in mapping".into()))
            .map_err(|e| e.into())
    }
}
