use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::charset::Charset;
use crate::parser::one::property::color_ref::ColorRef;
use crate::parser::one::property::layout_alignment::LayoutAlignment;
use crate::parser::one::property::paragraph_alignment::ParagraphAlignment;
use crate::parser::one::property_set::{
    embedded_ink_container, paragraph_style_object, rich_text_node,
};
use crate::parser::onenote::ink::{parse_ink_data, Ink, InkBoundingBox};
use crate::parser::onenote::note_tag::{parse_note_tags, NoteTag};
use crate::parser::onestore::object::Object;
use crate::parser::onestore::object_space::ObjectSpace;
use crate::utils::utils::log_warn;
use itertools::Itertools;

/// A rich text paragraph.
///
/// # Formatting
///
/// Rich-text formatting is represented by storing the paragraph text along
/// with a list of text runs. Each text run specified formatting that is only
/// applied to a substring of the paragraph text.
///
/// The text run indices represent where each text run ends. The last text run
/// always ends at the end of the paragraph text. If there are no text run indices,
/// the text run formatting applies to the whole paragraph.
///
/// Text runs can be rendered by splitting the paragraph text at the text run
/// indices and then applying each text run formatting to its respective
/// substring.
#[derive(Clone, Debug)]
pub struct RichText {
    pub(crate) text: String,

    pub(crate) text_run_formatting: Vec<ParagraphStyling>,
    pub(crate) text_run_indices: Vec<u32>,

    pub(crate) paragraph_style: ParagraphStyling,
    pub(crate) paragraph_space_before: f32,
    pub(crate) paragraph_space_after: f32,
    pub(crate) paragraph_line_spacing_exact: Option<f32>,
    pub(crate) paragraph_alignment: ParagraphAlignment,

    pub(crate) layout_alignment_in_parent: Option<LayoutAlignment>,
    pub(crate) layout_alignment_self: Option<LayoutAlignment>,

    pub(crate) note_tags: Vec<NoteTag>,
    pub(crate) embedded_objects: Vec<EmbeddedObject>,
}

impl RichText {
    /// The paragraph text content.
    pub fn text(&self) -> &str {
        &self.text
    }

    /// The formatting of each text run.
    ///
    /// See [\[MS-ONE\] 2.3.77].
    ///
    /// [\[MS-ONE\] 2.3.77]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/7b560477-14d0-4f2c-a65e-4159f69f299f
    pub fn text_run_formatting(&self) -> &[ParagraphStyling] {
        &self.text_run_formatting
    }

    /// The character positions where the text runs end.
    ///
    /// See [\[MS-ONE\] 2.3.76].
    ///
    /// [\[MS-ONE\] 2.3.76]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/f5ae3d7a-09dd-4904-a8bd-7a529d8067c3
    pub fn text_run_indices(&self) -> &[u32] {
        &self.text_run_indices
    }

    /// The base paragraph style.
    pub fn paragraph_style(&self) -> &ParagraphStyling {
        &self.paragraph_style
    }

    /// The paragraph's top margin in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.81].
    ///
    /// [\[MS-ONE\] 2.3.81]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/1a2958bd-7512-419b-a8a5-eda200edb7cd
    pub fn paragraph_space_before(&self) -> f32 {
        self.paragraph_space_before
    }

    /// The paragraph's bottom margin in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.82].
    ///
    /// [\[MS-ONE\] 2.3.82]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/505393e2-c641-416f-be83-050da44d581d
    pub fn paragraph_space_after(&self) -> f32 {
        self.paragraph_space_after
    }

    /// The paragraph's line spacing in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.83].
    ///
    /// [\[MS-ONE\] 2.3.83]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/4474bd74-5407-4675-a9bb-a32f81eb799c
    pub fn paragraph_line_spacing_exact(&self) -> Option<f32> {
        self.paragraph_line_spacing_exact
    }

    /// The paragraph's text alignment.
    ///
    /// See [\[MS-ONE\] 2.3.94].
    ///
    /// [\[MS-ONE\] 2.3.94]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/36edb135-5e8e-400f-9394-82853d662d90
    pub fn paragraph_alignment(&self) -> ParagraphAlignment {
        self.paragraph_alignment
    }

    /// The paragraph's alignment relative to the containing outline element (if present).
    ///
    /// See [\[MS-ONE\] 2.3.27].
    ///
    /// [\[MS-ONE\] 2.3.27]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/61fa50be-c355-4b8d-ac01-761a2f7f66c0
    pub fn layout_alignment_in_parent(&self) -> Option<LayoutAlignment> {
        self.layout_alignment_in_parent
    }

    /// The paragraph's alignment.
    ///
    /// See [\[MS-ONE\] 2.3.33].
    ///
    /// [\[MS-ONE\] 2.3.33]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/4e7fe9db-2fdb-4239-b291-dc4b909c94ad
    pub fn layout_alignment_self(&self) -> Option<LayoutAlignment> {
        self.layout_alignment_self
    }

    /// Note tags for this paragraph.
    pub fn note_tags(&self) -> &[NoteTag] {
        &self.note_tags
    }

    /// Objects embedded in this paragraph.
    pub fn embedded_objects(&self) -> &[EmbeddedObject] {
        &self.embedded_objects
    }
}

/// An object embedded in a rich text paragraph.
#[derive(Clone, Debug)]
pub enum EmbeddedObject {
    /// An ink handwriting object container.
    Ink(EmbeddedInkContainer),

    /// A space in the ink handwriting.
    InkSpace(EmbeddedInkSpace),

    /// A line break in the ink handwriting.
    InkLineBreak,
}

/// An ink handwriting object container.
#[derive(Clone, Debug)]
pub struct EmbeddedInkContainer {
    pub(crate) ink: Ink,
    pub(crate) bounding_box: Option<InkBoundingBox>,
}

impl EmbeddedInkContainer {
    /// The ink data embedded in a paragraph.
    pub fn ink(&self) -> &Ink {
        &self.ink
    }

    /// The ink object's bounding box.
    pub fn bounding_box(&self) -> Option<&InkBoundingBox> {
        self.bounding_box.as_ref()
    }
}

/// A space in an embedded ink handwriting object.
#[derive(Clone, Debug)]
pub struct EmbeddedInkSpace {
    height: f32,
    width: f32,
}

impl EmbeddedInkSpace {
    /// The space's height.
    pub fn height(&self) -> f32 {
        self.height
    }

    /// The space's width.
    pub fn width(&self) -> f32 {
        self.width
    }
}

/// A paragraph's style.
///
/// See [\[MS-ONE\] 2.2.43] and [\[MS-ONE\] 2.2.44].
///
/// [\[MS-ONE\] 2.2.43]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/38eb9b74-cfaf-4df7-b061-a83968c7ff5b
/// [\[MS-ONE\] 2.2.44]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/f0baabae-f42a-42e0-8cb2-869d420e865f
#[derive(Clone, Debug)]
pub struct ParagraphStyling {
    pub(crate) charset: Option<Charset>,
    pub(crate) bold: bool,
    pub(crate) italic: bool,
    pub(crate) underline: bool,
    pub(crate) strikethrough: bool,
    pub(crate) superscript: bool,
    pub(crate) subscript: bool,
    pub(crate) font: Option<String>,
    pub(crate) font_size: Option<u16>,
    pub(crate) font_color: Option<ColorRef>,
    pub(crate) highlight: Option<ColorRef>,
    pub(crate) next_style: Option<String>,
    pub(crate) style_id: Option<String>,
    pub(crate) paragraph_alignment: Option<ParagraphAlignment>,
    pub(crate) paragraph_space_before: Option<f32>,
    pub(crate) paragraph_space_after: Option<f32>,
    pub(crate) paragraph_line_spacing_exact: Option<f32>,
    pub(crate) language_code: Option<u32>,
    pub(crate) math_formatting: bool,
    pub(crate) hyperlink: bool,
}

impl ParagraphStyling {
    /// The text's charset.
    pub fn charset(&self) -> Option<Charset> {
        self.charset
    }

    /// Whether the text is bold.
    pub fn bold(&self) -> bool {
        self.bold
    }

    /// Whether the text is italic.
    pub fn italic(&self) -> bool {
        self.italic
    }

    /// Whether the text is underlined.
    pub fn underline(&self) -> bool {
        self.underline
    }

    /// Whether the text has strike-through formatting.
    pub fn strikethrough(&self) -> bool {
        self.strikethrough
    }

    /// Whether the text is formatted as superscript.
    pub fn superscript(&self) -> bool {
        self.superscript
    }

    /// Whether the text is formatted as subscript.
    pub fn subscript(&self) -> bool {
        self.subscript
    }

    /// The font for this text.
    pub fn font(&self) -> Option<&str> {
        self.font.as_deref()
    }

    /// The font size for this text in half-point increments.
    ///
    /// See [\[MS-ONE\] 2.3.16].
    ///
    /// [\[MS-ONE\] 2.3.16]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/f209fd9c-9042-4df2-b90c-1be20ac9c2d3
    pub fn font_size(&self) -> Option<u16> {
        self.font_size
    }

    /// The font color for this text.
    ///
    /// See [\[MS-ONE\] 2.3.45].
    ///
    /// [\[MS-ONE\] 2.3.45]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/17a7e6a7-7fa9-456f-a3fe-b2d8fef31be3
    pub fn font_color(&self) -> Option<ColorRef> {
        self.font_color
    }

    /// The background color for this text.
    ///
    /// See [\[MS-ONE\] 2.3.6].
    ///
    /// [\[MS-ONE\] 2.3.6]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/9932eafb-8200-4fc6-aa86-3a4d6a60bb62
    pub fn highlight(&self) -> Option<ColorRef> {
        self.highlight
    }

    /// The name of the default style for the next paragraph.
    ///
    /// See [\[MS-ONE\] 2.2.92].
    ///
    /// [\[MS-ONE\] 2.2.92]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/fa70a53b-2661-4d33-aec7-948488e49fc3
    pub fn next_style(&self) -> Option<&str> {
        self.next_style.as_deref()
    }

    /// The paragraph style's name.
    ///
    /// See [\[MS-ONE\] 2.2.83].
    ///
    /// [\[MS-ONE\] 2.2.83]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/4c9ad3ed-d804-44df-9c49-55b2a867db66
    pub fn style_id(&self) -> Option<&str> {
        self.style_id.as_deref()
    }

    /// The paragraph alignment.
    pub fn paragraph_alignment(&self) -> Option<ParagraphAlignment> {
        self.paragraph_alignment
    }

    /// The paragraph's top margin in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.81].
    ///
    /// [\[MS-ONE\] 2.3.81]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/1a2958bd-7512-419b-a8a5-eda200edb7cd
    pub fn paragraph_space_before(&self) -> Option<f32> {
        self.paragraph_space_before
    }

    /// The paragraph's bottom margin in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.82].
    ///
    /// [\[MS-ONE\] 2.3.82]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/505393e2-c641-416f-be83-050da44d581d
    pub fn paragraph_space_after(&self) -> Option<f32> {
        self.paragraph_space_after
    }

    /// The paragraph's line spacing in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.83].
    ///
    /// [\[MS-ONE\] 2.3.83]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/4474bd74-5407-4675-a9bb-a32f81eb799c
    pub fn paragraph_line_spacing_exact(&self) -> Option<f32> {
        self.paragraph_line_spacing_exact
    }

    /// The LCID language code for the text.
    ///
    /// See [\[MS-ONE\] 2.3.26].
    ///
    /// [\[MS-ONE\] 2.3.26]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/f82cdbc0-d4e9-4cd0-bd0b-8c7734853d7f
    pub fn language_code(&self) -> Option<u32> {
        self.language_code
    }

    /// Whether the text is formatted as a math expression
    pub fn math_formatting(&self) -> bool {
        self.math_formatting
    }

    /// Whether the text is the display text for a hyperlink
    pub fn hyperlink(&self) -> bool {
        self.hyperlink
    }
}

// Embedded object types
const INK_SPACE_BLOB: u32 = 0x00020026;
const INK_END_OF_LINE_BLOB: u32 = 0x00020027;

pub(crate) fn parse_rich_text(content_id: ExGuid, space: &ObjectSpace) -> Result<RichText> {
    let object = space
        .get_object(content_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("rich text content is missing".into()))?;
    let data = rich_text_node::parse(object)?;

    // Parse the base paragraph style
    let paragraph_style_object = space.get_object_or_fallback(data.paragraph_style, || {
        log_warn!("paragraph styling is missing");
        Object::fallback()
    });
    let paragraph_style_data = paragraph_style_object::parse(&paragraph_style_object)?;
    let paragraph_style = parse_style(paragraph_style_data);

    // Parse the styles text runs (part 1)
    let text_run_data = embedded_ink_container::Data::parse(object)?.unwrap_or_default();
    let styles_data: Vec<paragraph_style_object::Data> = data
        .text_run_formatting
        .iter()
        .map(|style_id| {
            space
                .get_object(*style_id)
                .ok_or_else(|| ErrorKind::MalformedOneNoteData("styling is missing".into()).into())
        })
        .map(|style_object| style_object.and_then(|object| paragraph_style_object::parse(object)))
        .collect::<Result<Vec<_>>>()?;

    // Parse the embedded objects
    let objects = text_run_data
        .into_iter()
        .zip(&styles_data)
        .flat_map(|(object_data, style_data)| {
            style_data
                .text_run_is_embedded_object
                .then(|| (style_data.text_run_object_type, object_data))
        })
        .collect_vec();

    let mut objects_without_ref = 0;

    let embedded_objects: Vec<_> = objects
        .into_iter()
        .enumerate()
        .map(|(i, (object_type, embedded_data))| match object_type {
            Some(INK_END_OF_LINE_BLOB) => {
                objects_without_ref += 1;
                Ok(Some(EmbeddedObject::InkLineBreak))
            }
            Some(INK_SPACE_BLOB) => {
                objects_without_ref += 1;
                parse_embedded_ink_space(embedded_data)
                    .map(|space| Some(EmbeddedObject::InkSpace(space)))
            }
            None => {
                if !data.text_run_data_object.is_empty() {
                    return parse_embedded_ink_data(
                        data.text_run_data_object[i - objects_without_ref],
                        space,
                        embedded_data,
                    )
                    .map(|container| Some(EmbeddedObject::Ink(container)));
                }

                Ok(None)
            }
            Some(v) => Err(ErrorKind::MalformedOneNoteFileData(
                format!("unknown embedded object type: {:x}", v).into(),
            )
            .into()),
        })
        .collect::<Result<Vec<_>>>()?
        .into_iter()
        .flatten()
        .collect_vec();

    // Parse the styles text runs (part 2)
    let styles = styles_data.into_iter().map(parse_style).collect_vec();

    // TODO: Parse lang code into iso code
    // dia-i18n = "0.8.0"

    let text = if !embedded_objects.is_empty() {
        "".to_string()
    } else {
        data.text.unwrap_or_default()
    };

    let text = RichText {
        text,
        embedded_objects,
        text_run_formatting: styles,
        text_run_indices: data.text_run_indices,
        paragraph_style,
        paragraph_space_before: data.paragraph_space_before,
        paragraph_space_after: data.paragraph_space_after,
        paragraph_line_spacing_exact: data.paragraph_line_spacing_exact,
        paragraph_alignment: data.paragraph_alignment,
        layout_alignment_in_parent: data.layout_alignment_in_parent,
        layout_alignment_self: data.layout_alignment_self,
        note_tags: parse_note_tags(data.note_tags, space)?,
    };

    Ok(text)
}

fn parse_embedded_ink_data(
    embedded_id: ExGuid,
    space: &ObjectSpace,
    data: embedded_ink_container::Data,
) -> Result<EmbeddedInkContainer> {
    let (strokes, bb) = parse_ink_data(embedded_id, space, None, None)?;

    let display_bb = data
        .start_x
        .zip(data.start_y)
        .zip(data.height)
        .zip(data.width)
        .map(|(((x, y), height), width)| InkBoundingBox {
            x,
            y,
            height,
            width,
        });

    let data = EmbeddedInkContainer {
        ink: Ink {
            ink_strokes: strokes,
            bounding_box: bb,
            offset_horizontal: data.offset_horiz,
            offset_vertical: data.offset_vert,
        },
        bounding_box: display_bb,
    };

    Ok(data)
}

fn parse_embedded_ink_space(data: embedded_ink_container::Data) -> Result<EmbeddedInkSpace> {
    let width = data.space_width.ok_or_else(|| {
        ErrorKind::MalformedOneNoteFileData("embedded ink space has no width".into())
    })?;

    let height = data.space_height.ok_or_else(|| {
        ErrorKind::MalformedOneNoteFileData("embedded ink space has no height".into())
    })?;

    Ok(EmbeddedInkSpace { height, width })
}

fn parse_style(data: paragraph_style_object::Data) -> ParagraphStyling {
    ParagraphStyling {
        charset: data.charset,
        bold: data.bold,
        italic: data.italic,
        underline: data.underline,
        strikethrough: data.strikethrough,
        superscript: data.superscript,
        subscript: data.subscript,
        font: data.font,
        font_size: data.font_size,
        font_color: data.font_color,
        highlight: data.highlight,
        next_style: data.next_style,
        style_id: data.style_id,
        paragraph_alignment: data.paragraph_alignment,
        paragraph_space_before: data.paragraph_space_before,
        paragraph_space_after: data.paragraph_space_after,
        paragraph_line_spacing_exact: data.paragraph_line_spacing_exact,
        language_code: data.language_code,
        math_formatting: data.math_formatting,
        hyperlink: data.hyperlink,
    }
}
