use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::file_type::FileType;
use crate::parser::one::property_set::{embedded_file_container, embedded_file_node};
use crate::parser::onenote::note_tag::{parse_note_tags, NoteTag};
use crate::parser::onestore::object_space::ObjectSpace;

/// An embedded file.
///
/// See [\[MS-ONE\] 2.2.32].
///
/// [\[MS-ONE\] 2.2.32]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/a665b5ad-ff40-4c0c-9e42-4b707254dc3f
#[derive(Clone, PartialEq, PartialOrd, Debug)]
pub struct EmbeddedFile {
    pub(crate) filename: String,
    pub(crate) file_type: FileType,
    pub(crate) data: Vec<u8>,

    pub(crate) layout_max_width: Option<f32>,
    pub(crate) layout_max_height: Option<f32>,

    pub(crate) offset_horizontal: Option<f32>,
    pub(crate) offset_vertical: Option<f32>,

    pub(crate) note_tags: Vec<NoteTag>,
}

impl EmbeddedFile {
    /// The embedded file's original file name.
    ///
    /// See [\[MS-ONE\] 2.2.71].
    ///
    /// [\[MS-ONE\] 2.2.71]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/9c3409c0-0d81-42a8-bd97-d02a5b130b7d
    pub fn filename(&self) -> &str {
        &self.filename
    }

    /// The file type.
    ///
    /// See [\[MS-ONE\] 2.3.62].
    ///
    /// [\[MS-ONE\] 2.3.62]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/112836a0-ed3b-4be1-bc4b-49f0f7b02295
    pub fn file_type(&self) -> &FileType {
        &self.file_type
    }

    /// The file's binary data.
    pub fn data(&self) -> &[u8] {
        &self.data
    }

    /// The max width of the embedded file's icon in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.21].
    ///
    /// [\[MS-ONE\] 2.3.21]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/2561c763-93b8-4b64-b6c7-1b86335d5b85
    pub fn layout_max_width(&self) -> Option<f32> {
        self.layout_max_width
    }

    /// The max height of the embedded file's icon in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.23].
    ///
    /// [\[MS-ONE\] 2.3.23]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/ce514d53-1229-4e77-9908-ef8de1761ceb
    pub fn layout_max_height(&self) -> Option<f32> {
        self.layout_max_height
    }

    /// The horizontal offset from the page origin in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.18].
    ///
    /// [\[MS-ONE\] 2.3.18]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/5fb9e84a-c9e9-4537-ab14-e5512f24669a
    pub fn offset_horizontal(&self) -> Option<f32> {
        self.offset_horizontal
    }

    /// The vertical offset from the page origin in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.19].
    ///
    /// [\[MS-ONE\] 2.3.19]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/5c4992ba-1db5-43e9-83dd-7299c562104d
    pub fn offset_vertical(&self) -> Option<f32> {
        self.offset_vertical
    }

    /// Note tags for the embedded file.
    pub fn note_tags(&self) -> &[NoteTag] {
        &self.note_tags
    }
}

pub(crate) fn parse_embedded_file(file_id: ExGuid, space: &ObjectSpace) -> Result<EmbeddedFile> {
    let node_object = space
        .get_object(file_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("embedded file is missing".into()))?;
    let node = embedded_file_node::parse(node_object)?;
    let fallback_value = ExGuid::fallback();

    if node.embedded_file_name.is_none() {
        return Err(ErrorKind::MalformedOneNoteData(
            "embedded file name didn't return any value".into(),
        )
        .into());
    }

    if node.embedded_file_container.is_none() {
        return Err(ErrorKind::MalformedOneNoteData(
            "embedded file container didn't return any value".into(),
        )
        .into());
    }

    if node.embedded_file_container.unwrap() == fallback_value {
        return Ok({
            EmbeddedFile {
                filename: node.embedded_file_name.unwrap(),
                file_type: node.file_type,
                data: Vec::<u8>::new(),
                layout_max_width: node.layout_max_width,
                layout_max_height: node.layout_max_height,
                offset_horizontal: node.offset_from_parent_horiz,
                offset_vertical: node.offset_from_parent_vert,
                note_tags: parse_note_tags(node.note_tags, space)?,
            }
        });
    }

    let container_object_id = node.embedded_file_container;
    let container_object = space
        .get_object(container_object_id.unwrap())
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteData("embedded file container is missing".into())
        })?;
    let container = embedded_file_container::parse(container_object)?;

    // TODO: Resolve picture container

    let file = EmbeddedFile {
        filename: node.embedded_file_name.unwrap(),
        file_type: node.file_type,
        data: container.into_value(),
        layout_max_width: node.layout_max_width,
        layout_max_height: node.layout_max_height,
        offset_horizontal: node.offset_from_parent_horiz,
        offset_vertical: node.offset_from_parent_vert,
        note_tags: parse_note_tags(node.note_tags, space)?,
    };

    Ok(file)
}
