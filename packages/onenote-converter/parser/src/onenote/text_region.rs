use crate::{one::property::{PropertyType}, onenote::rich_text::ParagraphStyling, shared::{prop_set::PropertySet, property::PropertyId}};
use parser_utils::errors::Result;

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
        text: &str,
        text_run_indices: &Vec<u32>,
        styles: &Vec<ParagraphStyling>,
        text_run_data_values: &Vec<PropertySet>,
    ) -> Result<Vec<TextRegion>> {
        let mut indices = text_run_indices.clone();
        let mut styles = styles.clone();

        // TODO: Maybe this shouldn't be here
        // When the this character is at the start of the paragraph it makes
        // all the styles to be shifted by minus one.
        // A better solution would be to look if there isn't anything wrong with the parser,
        // but I haven't found what could be causing this yet.
        if text.starts_with("\u{000B}") && !indices.is_empty() {
            indices.remove(0);
            styles.pop();
        }

        // Probably the best solution here would be to rewrite the render_hyperlink to take this
        // case in account, backtracking if necessary, but this will do for now
        // https://github.com/laurent22/joplin/issues/11617
        if text.starts_with("\u{fddf}") {
            let first_indice = *indices.get(0).unwrap_or(&0);
            if first_indice == 1 {
                indices.remove(0);
                styles.pop();
            }
        }

        if indices.is_empty() {
            return Ok(vec![ TextRegion::from_text(&text) ]);
        }

        let style_count = styles.len();
        let index_count = indices.len();
        if index_count + 1 < style_count {
            return Err(
                parser_error!(
                    MalformedOneNoteData,
                    "Wrong number of styles in paragraph (styles: {style_count}, ranges: {index_count})"
                ).into()
            );
        }

        // Split text into parts specified by indices
        let texts = {
            let mut text_iter = text.chars();
            let mut texts: Vec<String> = Vec::new();

            let mut last_index = 0;
            for index in indices.iter().copied() {
                let count = (index - last_index) as usize;

                let part = text_iter.by_ref().take(count).collect();
                println!("idx: {index}, {part}");
                texts.push(part);
                last_index = index;
            }
            texts.push(text_iter.collect());
            println!("texts: {texts:?}");
            texts
        };

        TextRegionParser::parse(texts, styles, text_run_data_values)
    }
}

struct TextRegionParser {
    parts: Vec<TextRegion>,

    hyperlink_href: Option<String>,
    hyperlink_href_finished: bool,
}

impl TextRegionParser {
    fn parse(texts: Vec<String>, styles: Vec<ParagraphStyling>, additional_data: &Vec<PropertySet>) -> Result<Vec<TextRegion>> {
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
            hyperlink_href_finished: false,
        }
    }

    fn push_hyperlink(
        &mut self,
        text: &str,
        styles: Option<&ParagraphStyling>,
    ) -> Result<()> {
        const HYPERLINK_MARKER: &str = "\u{fddf}HYPERLINK \"";

        if text.starts_with(HYPERLINK_MARKER) {
            let url = text
                .strip_prefix(HYPERLINK_MARKER)
                .ok_or_else(|| parser_error!(MalformedOneNoteData, "Hyperlink has no start marker"))?;

            if let Some(url) = url.strip_suffix('"') {
                self.hyperlink_href = Some(url.into());
                self.hyperlink_href_finished = true;
            } else {
                // If we didn't find the double quotes means that href still has content in
                // the text regions that follow.
                self.hyperlink_href = Some(url.into());
                self.hyperlink_href_finished = false;
            }
        } else if let Some(href) = self.hyperlink_href.clone() && self.hyperlink_href_finished {
            self.hyperlink_href = None;

            self.parts.push(TextRegion {
                text: text.into(),
                style: styles.cloned(),
                hyperlink: Some(Hyperlink {
                    is_link_start: false,
                    is_link_end: true,
                    href: href,
                }),
                math: None,
            });
        } else if let Some(href_start) = &self.hyperlink_href && !self.hyperlink_href_finished {
            let url = text.strip_suffix('"');
            if let Some(url) = url {
                self.hyperlink_href = Some(format!("{href_start}{url}"));
                self.hyperlink_href_finished = true;
            } else {
                self.hyperlink_href = Some(format!("{href_start}{text}"));
            }
        } else {
            self.hyperlink_href_finished = true;
            self.hyperlink_href = None;

            self.parts.push(TextRegion {
                text: text.into(),
                style: styles.cloned(),
                hyperlink: Some(Hyperlink {
                    is_link_start: true,
                    is_link_end: true,
                    href: text.into(),
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
        let last_was_math = self.parts
            .last()
            .map(|last| last.math.is_some()).unwrap_or(false);

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
        if let Some(last) = self.parts.last_mut() {
            if let Some(math) = &mut last.math {
                math.is_math_end = true;
            }
        }
    }

    fn push(&mut self, text: &str, style: Option<&ParagraphStyling>, additional_data: Option<&PropertySet>) -> Result<()> {
        let (hyperlink, math) = match style {
            Some(style) => {
                (style.hyperlink(), style.math_formatting())
            },
            None => (false, false),
        };

        let text = if text.len() == 0 { "{{e}}" } else { text };

        if hyperlink {
            self.push_hyperlink(text, style)?;
        } else if math {
            self.push_math(text, style, additional_data)?;
        } else {
            // Correct
            self.end_math();

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

        Ok(self.parts)
    }
}

fn text_region_to_latex(text: &str, additional_data: &PropertySet) -> Result<String> {
    let text = format!("[{text}]");

    let op_type = match additional_data
        .get(PropertyId::new(PropertyType::MathOperator as u32))
        .map(|operator_value| operator_value.to_u32()).flatten()
    {
        Some(2415919104) => {
            "OP1"
        },
        Some(94) => {
            "frac"
        },
        Some(_) => {
            "Unknown"
        },
        None => "",
    };
    // See https://devblogs.microsoft.com/math-in-office/officemath/
    let tex = text
        .replace("\u{FDD0}", &format!("{{_{} ", op_type))
        .replace("\u{FDEF}", "}")
        .replace("\u{FDEE}", "<arg>")
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
