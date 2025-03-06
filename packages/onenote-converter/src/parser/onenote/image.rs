use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::layout_alignment::LayoutAlignment;
use crate::parser::one::property_set::{image_node, picture_container};
use crate::parser::onenote::iframe::{parse_iframe, IFrame};
use crate::parser::onenote::note_tag::{parse_note_tags, NoteTag};
use crate::parser::onestore::object_space::ObjectSpace;

/// An embedded image.
///
/// See [\[MS-ONE\] 2.2.24].
///
/// [\[MS-ONE\] 2.2.24]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/b7bb4d1a-2a57-4819-9eb4-5a2ce8cf210f
#[derive(Clone, PartialEq, PartialOrd, Debug)]
pub struct Image {
    pub(crate) data: Option<Vec<u8>>,
    pub(crate) extension: Option<String>,

    pub(crate) layout_max_width: Option<f32>,
    pub(crate) layout_max_height: Option<f32>,

    // pub(crate) language_code: Option<u32>,
    pub(crate) alt_text: Option<String>,

    pub(crate) layout_alignment_in_parent: Option<LayoutAlignment>,
    pub(crate) layout_alignment_self: Option<LayoutAlignment>,

    pub(crate) image_filename: Option<String>,

    pub(crate) displayed_page_number: Option<u32>,

    pub(crate) text: Option<String>,
    pub(crate) text_language_code: Option<u32>,

    pub(crate) picture_width: Option<f32>,
    pub(crate) picture_height: Option<f32>,

    pub(crate) hyperlink_url: Option<String>,

    pub(crate) offset_horizontal: Option<f32>,
    pub(crate) offset_vertical: Option<f32>,

    pub(crate) is_background: bool,

    pub(crate) note_tags: Vec<NoteTag>,

    pub(crate) embeds: Vec<IFrame>,
}

impl Image {
    /// The image's binary data.
    ///
    /// If `None` this means that the image data hasn't been uploaded yet.
    pub fn data(&self) -> Option<&[u8]> {
        self.data.as_deref()
    }

    /// The image's file extension.
    pub fn extension(&self) -> Option<&str> {
        self.extension.as_deref()
    }

    /// The maximum width to display the image in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.21].
    ///
    /// [\[MS-ONE\] 2.3.21]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/2561c763-93b8-4b64-b6c7-1b86335d5b85
    pub fn layout_max_width(&self) -> Option<f32> {
        self.layout_max_width
    }

    /// The maximum height to display the image in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.23].
    ///
    /// [\[MS-ONE\] 2.3.23]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/ce514d53-1229-4e77-9908-ef8de1761ceb
    pub fn layout_max_height(&self) -> Option<f32> {
        self.layout_max_height
    }

    /// Alternative text for the image.
    ///
    /// Usually this seems to be the result of OneNote's OCR processing.
    ///
    /// See [\[MS-ONE\] 2.2.79].
    ///
    /// [\[MS-ONE\] 2.2.79]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/f39569a6-84fa-4d5b-8a65-2b3e0ee36117
    pub fn alt_text(&self) -> Option<&str> {
        self.alt_text.as_deref()
    }

    /// The image's alignment relative to the containing outline element (if present).
    ///
    /// See [\[MS-ONE\] 2.3.27].
    ///
    /// [\[MS-ONE\] 2.3.27]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/61fa50be-c355-4b8d-ac01-761a2f7f66c0
    pub fn layout_alignment_in_parent(&self) -> Option<LayoutAlignment> {
        self.layout_alignment_in_parent
    }

    /// The image's alignment.
    ///
    /// See [\[MS-ONE\] 2.3.33].
    ///
    /// [\[MS-ONE\] 2.3.33]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/4e7fe9db-2fdb-4239-b291-dc4b909c94ad
    pub fn layout_alignment_self(&self) -> Option<LayoutAlignment> {
        self.layout_alignment_self
    }

    /// The image's original file name.
    ///
    /// See [\[MS-ONE\] 2.2.75].
    ///
    /// [\[MS-ONE\] 2.2.75]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/91f543ab-dfe5-47ce-9c61-a49680c726bb
    pub fn image_filename(&self) -> Option<&str> {
        self.image_filename.as_deref()
    }

    /// The page number to display if the image file contains multiple pages (e.g. XPS, PDF).
    ///
    /// See [\[MS-ONE\] 2.3.95].
    ///
    /// [\[MS-ONE\] 2.3.95]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/acf52570-aa45-45ef-a62e-38f4a5844d5e
    pub fn displayed_page_number(&self) -> Option<u32> {
        self.displayed_page_number
    }

    /// The text for the image.
    pub fn text(&self) -> Option<&str> {
        self.text.as_deref()
    }

    /// The text's language code (MS-LCID)
    pub fn text_language_code(&self) -> Option<u32> {
        self.text_language_code
    }

    /// The image's width in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.100].
    ///
    /// [\[MS-ONE\] 2.3.100]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/b4feae22-69cb-4623-8d40-faf97a026465
    pub fn picture_width(&self) -> Option<f32> {
        self.picture_width
    }

    /// The image's height in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.101].
    ///
    /// [\[MS-ONE\] 2.3.101]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/65454c84-1a39-4e81-ba50-053666d92dd0
    pub fn picture_height(&self) -> Option<f32> {
        self.picture_height
    }

    /// A hyperlink associated with this image.
    pub fn hyperlink_url(&self) -> Option<&str> {
        self.hyperlink_url.as_deref()
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

    /// Whether the image is a background image.
    ///
    /// See [\[MS-ONE\] 2.3.61].
    ///
    /// [\[MS-ONE\] 2.3.61]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/d8623a4b-7496-48fd-af00-8c8f9507c93b
    pub fn is_background(&self) -> bool {
        self.is_background
    }

    /// Note tags for this image.
    pub fn note_tags(&self) -> &[NoteTag] {
        &self.note_tags
    }

    /// Embedded iframes for this image.
    pub fn embeds(&self) -> &[IFrame] {
        &self.embeds
    }
}

pub(crate) fn parse_image(image_id: ExGuid, space: &ObjectSpace) -> Result<Image> {
    let node_object = space
        .get_object(image_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("image is missing".into()))?;
    let node = image_node::parse(node_object)?;

    let container_data = node
        .picture_container
        .map(|container_object_id| {
            space
                .get_object(container_object_id)
                .ok_or_else(|| ErrorKind::MalformedOneNoteData("image container is missing".into()))
        })
        .transpose()?
        .map(|container_object| picture_container::parse(container_object))
        .transpose()?;

    let (data, extension) = if let Some(data) = container_data {
        (Some(data.data), data.extension)
    } else {
        (None, None)
    };

    let embed = node
        .iframe
        .into_iter()
        .map(|iframe_id| parse_iframe(iframe_id, space))
        .collect::<Result<_>>()?;

    // TODO: Parse language code

    let image = Image {
        data,
        extension,
        layout_max_width: node.layout_max_width,
        layout_max_height: node.layout_max_height,
        alt_text: node.alt_text.map(String::from),
        layout_alignment_in_parent: node.layout_alignment_in_parent,
        layout_alignment_self: node.layout_alignment_self,
        image_filename: node.image_filename,
        displayed_page_number: node.displayed_page_number,
        text: node.text.map(String::from),
        text_language_code: node.text_language_code,
        picture_width: node.picture_width,
        picture_height: node.picture_height,
        hyperlink_url: node.hyperlink_url.map(String::from),
        offset_horizontal: node.offset_from_parent_horiz,
        offset_vertical: node.offset_from_parent_vert,
        is_background: node.is_background,
        note_tags: parse_note_tags(node.note_tags, space)?,
        embeds: embed,
    };

    Ok(image)
}
