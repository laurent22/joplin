use crate::{
    one::property::PropertyType, onenote::rich_text::ParagraphStyling,
    shared::prop_set::PropertySet,
};
use parser_utils::{Utf16ToString, errors::Result};

/// Stores information about a part of a [RichText] region.
#[derive(Debug, Clone)]
pub struct TextRegion {
    text: String,
    style: Option<ParagraphStyling>,

    hyperlink: Option<Hyperlink>,
    math: Option<MathExpression>,
}

impl TextRegion {
    /// The (visible) text content of this region
    pub fn text(&self) -> &str {
        &self.text
    }

    /// Styles associated with this region
    pub fn style(&self) -> Option<&ParagraphStyling> {
        self.style.as_ref()
    }

    /// If a hyperlink, the hyperlink data
    pub fn hyperlink(&self) -> Option<&Hyperlink> {
        self.hyperlink.as_ref()
    }

    /// If math, the math data
    pub fn math(&self) -> Option<&MathExpression> {
        self.math.as_ref()
    }

    fn from_text(text: &str) -> Self {
        Self {
            text: String::from(text),
            style: None,

            math: None,
            hyperlink: None,
        }
    }

    pub(crate) fn parse(
        raw_text: &[u8],
        text_run_indices: &[u32],
        styles: &[ParagraphStyling],
        text_run_data_values: &[PropertySet],
    ) -> Result<Vec<TextRegion>> {
        if text_run_indices.is_empty() {
            let text = raw_text.utf16_to_string()?;
            return Ok(vec![TextRegion::from_text(&text)]);
        }

        let style_count = styles.len();
        let index_count = text_run_indices.len();
        if index_count + 1 < style_count {
            return Err(parser_error!(
                MalformedOneNoteData,
                "Wrong number of styles in paragraph (styles: {style_count}, ranges: {index_count})"
            )
            .into());
        }

        // Split text into parts specified by indices
        let texts = {
            let mut text_iter = raw_text.iter().copied();
            let mut texts: Vec<String> = Vec::new();

            let mut last_index = 0;
            for index in text_run_indices.iter().copied() {
                let count = (index - last_index) as usize;
                let count_utf_16 = count * 2;

                let part: Vec<u8> = text_iter.by_ref().take(count_utf_16).collect();
                let part_text = part.as_slice().utf16_to_string()?;

                // TODO: When the bell character is at the start of the paragraph it shifts
                // all styles and attributes by one. For now, ignore leading segments that contain
                // only the bell character. In the future, look into why this issue is happening.
                if !texts.is_empty() || part_text != "\u{000B}" {
                    texts.push(part_text);
                }
                last_index = index;
            }
            let end_text: Vec<u8> = text_iter.collect();
            texts.push(end_text.as_slice().utf16_to_string()?);
            texts
        };

        TextRegionParser::parse(texts, styles, text_run_data_values)
    }
}

struct TextRegionParser {
    parts: Vec<TextRegion>,

    hyperlink_href: Option<String>,
    // If true and hyperlink_href is Some, hyperlink_href contains a full HREF. Otherwise,
    // hyperlink_href may be partial (in the process of being built).
    hyperlink_href_finished: bool,
    hyperlink_next_prefix: Option<String>,
}

impl TextRegionParser {
    fn parse(
        texts: Vec<String>,
        styles: &[ParagraphStyling],
        additional_data: &[PropertySet],
    ) -> Result<Vec<TextRegion>> {
        let mut style_iterator = styles.iter();
        let mut additional_data_iterator = additional_data.iter();
        let mut text_region_parser = TextRegionParser::new();
        for text_segment in texts.iter() {
            let style = style_iterator.next();
            let additional_data = additional_data_iterator.next();
            text_region_parser.push(text_segment, style, additional_data)?;
        }

        text_region_parser.finish()
    }

    fn new() -> Self {
        Self {
            parts: Vec::new(),

            hyperlink_href: None,
            hyperlink_next_prefix: None,
            hyperlink_href_finished: true,
        }
    }

    fn push_hyperlink(&mut self, text: &str, styles: Option<&ParagraphStyling>) -> Result<()> {
        let text = if let Some(prefix) = &self.hyperlink_next_prefix {
            let prefixed = format!("{prefix}{text}");
            self.hyperlink_next_prefix = None;
            prefixed
        } else {
            text.into()
        };

        const HYPERLINK_MARKER: &str = "\u{fddf}HYPERLINK \"";

        if text == "\u{fddf}" && self.parts.is_empty() {
            self.hyperlink_next_prefix = Some(text);
        } else if text.starts_with(HYPERLINK_MARKER) {
            // Ensure that the previous link (if any) has ended
            self.end_link();

            let url = text.strip_prefix(HYPERLINK_MARKER).ok_or_else(|| {
                parser_error!(MalformedOneNoteData, "Hyperlink has no start marker")
            })?;

            if let Some(url) = url.strip_suffix('"') {
                self.hyperlink_href = Some(url.into());
                self.hyperlink_href_finished = true;
            } else {
                // If we didn't find the double quotes, the HREF will be continued in
                // the text regions that follow.
                self.hyperlink_href = Some(url.into());
                self.hyperlink_href_finished = false;
            }
        } else if let Some(href) = self.hyperlink_href.clone()
            && self.hyperlink_href_finished
        {
            self.hyperlink_href = None;

            let is_link_start = if let Some(last) = self.parts.last() {
                if let Some(link) = &last.hyperlink {
                    !link.is_link_end
                } else {
                    true
                }
            } else {
                true
            };

            self.parts.push(TextRegion {
                text: text,
                style: styles.cloned(),
                hyperlink: Some(Hyperlink {
                    is_link_start,
                    is_link_end: false,
                    href,
                }),
                math: None,
            });
        } else if let Some(href_start) = &self.hyperlink_href
            && !self.hyperlink_href_finished
        {
            let url = text.strip_suffix('"');
            if let Some(url) = url {
                self.hyperlink_href = Some(format!("{href_start}{url}"));
                self.hyperlink_href_finished = true;
            } else {
                self.hyperlink_href = Some(format!("{href_start}{text}"));
            }
        } else {
            self.end_link();

            self.parts.push(TextRegion {
                text: text.clone(),
                style: styles.cloned(),
                hyperlink: Some(Hyperlink {
                    is_link_start: true,
                    is_link_end: true,
                    href: text,
                }),
                math: None,
            })
        }

        Ok(())
    }

    fn push_math(
        &mut self,
        text: &str,
        styles: Option<&ParagraphStyling>,
        additional_data: Option<&PropertySet>,
    ) -> Result<()> {
        let last_was_math = self
            .parts
            .last()
            .map(|last| last.math.is_some())
            .unwrap_or(false);

        let additional_data = additional_data.cloned().unwrap_or_default();
        self.parts.push(TextRegion {
            text: text.into(),
            style: styles.cloned(),
            hyperlink: None,
            math: Some(MathExpression {
                latex: text_region_to_latex(text, &additional_data)?,
                is_math_start: !last_was_math,
                is_math_end: false,
            }),
        });
        Ok(())
    }

    /// Updates the last item (if math) to mark it as a math-end region
    fn end_math(&mut self) {
        if let Some(last) = self.parts.last_mut()
            && let Some(math) = &mut last.math
        {
            math.is_math_end = true;
        }
    }

    fn end_link(&mut self) {
        if let Some(last) = self.parts.last_mut()
            && let Some(link) = &mut last.hyperlink
        {
            link.is_link_end = true;
            // Reset link state
            self.hyperlink_href_finished = true;
            self.hyperlink_href = None;
        }
    }

    fn push(
        &mut self,
        text: &str,
        style: Option<&ParagraphStyling>,
        additional_data: Option<&PropertySet>,
    ) -> Result<()> {
        let (hyperlink, math) = match style {
            Some(style) => (style.hyperlink(), style.math_formatting()),
            None => (false, false),
        };

        if hyperlink {
            self.end_math();
            self.push_hyperlink(text, style)?;
        } else if math {
            self.end_link();
            self.push_math(text, style, additional_data)?;
        } else {
            // Correct end information
            self.end_math();
            self.end_link();

            self.parts.push(TextRegion {
                text: text.into(),
                style: style.cloned(),
                hyperlink: None,
                math: None,
            });
        }

        Ok(())
    }

    fn finish(mut self) -> Result<Vec<TextRegion>> {
        self.end_math();
        self.end_link();

        Ok(self.parts)
    }
}

fn text_region_to_latex(text: &str, additional_data: &PropertySet) -> Result<String> {
    let op_type = match additional_data
        .get_from_type(PropertyType::MathOperator)
        .and_then(|operator_value| operator_value.to_u32())
    {
        Some(21) => {
            let variant = additional_data
                .get_from_type(PropertyType::MathUnknown1)
                .and_then(|variant| variant.to_u16())
                .unwrap_or_default();
            if variant == 8721 {
                "∑".into()
            } else {
                "∫".into()
            }
        }
        Some(13) => "parens".into(),
        Some(17) => "fnCall".into(),
        Some(19) => "withSubscript".into(),
        Some(16 | 26) => "frac".into(),
        Some(11) => "mathrm".into(),
        Some(31) => "pow".into(),
        Some(other) => {
            format!("unknown{{{}}}", other)
        }
        None => "".into(),
    };

    let operator_name = if !op_type.is_empty() {
        format!("\\{op_type}")
    } else {
        String::from("")
    };

    // See https://devblogs.microsoft.com/math-in-office/officemath/
    let tex = text
        .replace("\u{FDD0}", &format!("{operator_name}{{"))
        .replace("\u{FDEF}", "}")
        .replace("\u{FDEE}", "}{")
        .replace("\u{FFFC}", "<obj>");

    println!("Additional data: {:?}, for {}", additional_data, tex);

    Ok(tex)
}

/// Information about a hyperlink region
#[allow(missing_docs)]
#[derive(Clone, Debug)]
pub struct Hyperlink {
    pub is_link_start: bool,
    pub is_link_end: bool,
    pub href: String,
}

/// Information about a math expression
#[allow(missing_docs)]
#[derive(Clone, Debug)]
pub struct MathExpression {
    pub is_math_start: bool,
    pub is_math_end: bool,
    pub latex: String,
}
