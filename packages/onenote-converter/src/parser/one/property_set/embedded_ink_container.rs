use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::object_reference::ObjectReference;
use crate::parser::one::property::object_space_reference::ObjectSpaceReference;
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::onestore::object::Object;
use crate::parser::onestore::types::compact_id::CompactId;
use crate::parser::onestore::types::jcid::JcId;
use crate::parser::onestore::types::object_prop_set::ObjectPropSet;
use crate::parser::onestore::types::prop_set::PropertySet;
use crate::parser::onestore::types::property::PropertyId;

/// An embedded ink handwriting container.
#[derive(Debug)]
pub(crate) struct Data {
    pub(crate) space_width: Option<f32>,
    pub(crate) space_height: Option<f32>,

    pub(crate) start_x: Option<f32>,
    pub(crate) start_y: Option<f32>,
    pub(crate) height: Option<f32>,
    pub(crate) width: Option<f32>,
    pub(crate) offset_horiz: Option<f32>,
    pub(crate) offset_vert: Option<f32>,
}

impl Data {
    pub(crate) fn parse(object: &Object) -> Result<Option<Vec<Data>>> {
        let (prop_id, prop_sets) = match object.props().get(PropertyType::TextRunData) {
            Some(value) => value.to_property_values().ok_or_else(|| {
                ErrorKind::MalformedOneNoteFileData(
                    "embedded ink container is not a property values list".into(),
                )
            })?,
            None => return Ok(None),
        };

        let data = prop_sets
            .iter()
            .map(|props| {
                let object = Self::parse_object(object, prop_id, props)?;
                let data = Self::parse_data(object)?;

                Ok(data)
            })
            .collect::<Result<Vec<_>>>()?;

        Ok(Some(data))
    }

    fn parse_object<'a>(
        object: &'a Object,
        prop_id: PropertyId,
        props: &PropertySet,
    ) -> Result<Object<'a>> {
        Ok(Object {
            context_id: object.context_id,
            jc_id: JcId(prop_id.value()),
            props: ObjectPropSet {
                object_ids: Self::get_object_ids(props, object)?,
                object_space_ids: Self::get_object_space_ids(props, object)?,
                context_ids: vec![],
                properties: props.clone(),
            },
            file_data: None,
            mapping: object.mapping.clone(),
        })
    }

    fn parse_data(object: Object) -> Result<Data> {
        let space_width = simple::parse_f32(PropertyType::EmbeddedInkSpaceWidth, &object)?;
        let space_height = simple::parse_f32(PropertyType::EmbeddedInkSpaceHeight, &object)?;

        let start_x = simple::parse_f32(PropertyType::EmbeddedInkStartX, &object)?;
        let start_y = simple::parse_f32(PropertyType::EmbeddedInkStartY, &object)?;
        let height = simple::parse_f32(PropertyType::EmbeddedInkHeight, &object)?;
        let width = simple::parse_f32(PropertyType::EmbeddedInkWidth, &object)?;
        let offset_horiz = simple::parse_f32(PropertyType::EmbeddedInkOffsetHoriz, &object)?;
        let offset_vert = simple::parse_f32(PropertyType::EmbeddedInkOffsetVert, &object)?;

        let data = Data {
            space_width,
            space_height,
            start_x,
            start_y,
            height,
            width,
            offset_horiz,
            offset_vert,
        };

        Ok(data)
    }

    fn get_object_ids(props: &PropertySet, object: &Object) -> Result<Vec<CompactId>> {
        Ok(object
            .props
            .object_ids
            .iter()
            .skip(ObjectReference::get_offset(
                PropertyType::TextRunData,
                object,
            )?)
            .take(ObjectReference::count_references(props.values()))
            .copied()
            .collect())
    }

    fn get_object_space_ids(props: &PropertySet, object: &Object) -> Result<Vec<CompactId>> {
        Ok(object
            .props
            .object_ids
            .iter()
            .skip(ObjectSpaceReference::get_offset(
                PropertyType::TextRunData,
                object,
            )?)
            .take(ObjectSpaceReference::count_references(props.values()))
            .copied()
            .collect())
    }
}
