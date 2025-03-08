use crate::page::Renderer;
use crate::parser::contents::{EmbeddedObject, RichText};
use crate::parser::property::common::ColorRef;
use crate::parser::property::rich_text::{ParagraphAlignment, ParagraphStyling};
use crate::utils::{px, AttributeSet, StyleSet};
use color_eyre::eyre::ContextCompat;
use color_eyre::Result;
use itertools::Itertools;
use once_cell::sync::Lazy;
use regex::{Captures, Regex};

impl<'a> Renderer<'a> {
    pub(crate) fn render_rich_text(&mut self, text: &RichText) -> Result<String> {
        let mut content = String::new();
        let mut attrs = AttributeSet::new();
        let mut style = self.parse_paragraph_styles(text);

        if let Some((note_tag_html, note_tag_styles)) = self.render_note_tags(text.note_tags()) {
            content.push_str(&note_tag_html);
            style.extend(note_tag_styles);
        }

        content.push_str(&self.parse_content(text)?);

        if content.starts_with("http://") || content.starts_with("https://") {
            content = format!("<a href=\"{}\">{}</a>", content, content);
        }

        if style.len() > 0 {
            attrs.set("style", style.to_string());
        }

        match text.paragraph_style().style_id() {
            Some(t) if !self.in_list && is_tag(t) => {
                Ok(format!("<{} {}>{}</{}>", t, attrs, content, t))
            }
            _ if style.len() > 0 => Ok(format!("<span style=\"{}\">{}</span>", style, content)),
            _ => Ok(content),
        }
    }

    fn parse_content(&mut self, data: &RichText) -> Result<String> {
        if !data.embedded_objects().is_empty() {
            return Ok(data
                .embedded_objects()
                .iter()
                .map(|object| match object {
                    EmbeddedObject::Ink(container) => {
                        self.render_ink(container.ink(), container.bounding_box(), true)
                    }
                    EmbeddedObject::InkSpace(space) => {
                        format!("<span class=\"ink-space\" style=\"padding-left: {}; padding-top: {};\"></span>",
                                px(space.width()), px(space.height()))
                    }
                    EmbeddedObject::InkLineBreak => {
                        "<span class=\"ink-linebreak\"><br></span>".to_string()
                    }
                })
                .collect_vec()
                .join(""));
        }

        let mut indices = data.text_run_indices().to_vec();
        let mut styles = data.text_run_formatting().to_vec();

        let mut text = data.text().to_string();

        if text.is_empty() {
            text = "&nbsp;".to_string();
        }

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
            let first_indice = match indices.get(0) {
                Some(i) => *i,
                None => 0,
            };
            if first_indice == 1 {
                indices.remove(0);
                styles.pop();
            }
        }

        if indices.is_empty() {
            return Ok(fix_newlines(&text));
        }

        assert!(indices.len() + 1 >= styles.len());

        // Split text into parts specified by indices
        let mut parts: Vec<String> = vec![];

        for i in indices.iter().copied().rev() {
            let part = text.chars().skip(i as usize).collect();
            text = text.chars().take(i as usize).collect();

            parts.push(part);
        }

        if !indices.is_empty() {
            parts.push(text);
        }

        let mut in_hyperlink = false;
        let mut is_href_finished = true;

        let content = parts
            .into_iter()
            .rev()
            .zip(styles.iter())
            .map(|(text, style)| {
                if style.hyperlink() {
                    let result =
                        self.render_hyperlink(text.clone(), style, in_hyperlink, is_href_finished);
                    if result.is_ok() {
                        in_hyperlink = true;
                        is_href_finished = result.as_ref().unwrap().1;
                        Ok(result.unwrap().0)
                    } else {
                        Ok(text)
                    }
                } else {
                    in_hyperlink = false;
                    is_href_finished = true;

                    let style = self.parse_style(style);

                    if style.len() > 0 {
                        Ok(format!("<span style=\"{}\">{}</span>", style, text))
                    } else {
                        Ok(text)
                    }
                }
            })
            .collect::<Result<String>>()?;

        Ok(fix_newlines(&content))
    }

    /// The hyperlink is delimited by the HYPERLINK_MARKER until the closing double quote
    /// In some cases the hyperlink is broken in more than one style (e.g.: when there are
    /// chinese characters on the url path), so we must keep track of the href status
    /// https://github.com/laurent22/joplin/issues/11600
    fn render_hyperlink(
        &self,
        text: String,
        style: &ParagraphStyling,
        in_hyperlink: bool,
        is_href_finished: bool,
    ) -> Result<(String, bool)> {
        const HYPERLINK_MARKER: &str = "\u{fddf}HYPERLINK \"";

        let style = self.parse_style(style);

        if text.starts_with(HYPERLINK_MARKER) {
            let url = text
                .strip_prefix(HYPERLINK_MARKER)
                .wrap_err("Hyperlink has no start marker")?;

            let url_2 = url.strip_suffix('"');

            if url_2.is_some() {
                return Ok((
                    format!("<a href=\"{}\" style=\"{}\">", url_2.unwrap(), style),
                    true,
                ));
            } else {
                // If we didn't find the double quotes means that href still has content in following styles
                Ok((format!("<a href=\"{}", url), false))
            }
        } else if in_hyperlink && is_href_finished {
            Ok((text + "</a>", true))
        } else if in_hyperlink && !is_href_finished {
            let url = text.strip_suffix('"');
            if url.is_some() {
                return Ok((format!("{}\" style=\"{}\">", url.unwrap(), style), true));
            } else {
                Ok((text, false))
            }
        } else {
            Ok((
                format!("<a href=\"{}\" style=\"{}\">{}</a>", text, style, text),
                true,
            ))
        }
    }

    fn parse_paragraph_styles(&self, text: &RichText) -> StyleSet {
        if !text.embedded_objects().is_empty() {
            assert_eq!(
                text.text(),
                "",
                "paragraph with text and embedded objects is not supported"
            );

            return StyleSet::new();
        }

        let mut styles = self.parse_style(text.paragraph_style());

        if let [style] = text.text_run_formatting() {
            styles.extend(self.parse_style(style))
        }

        if text.paragraph_space_before() > 0.0 {
            styles.set("padding-top", px(text.paragraph_space_before()))
        }

        if text.paragraph_space_after() > 0.0 {
            styles.set("padding-bottom", px(text.paragraph_space_after()))
        }

        if let Some(line_spacing) = text.paragraph_line_spacing_exact() {
            styles.set(
                "line-height",
                ((line_spacing as f32) * 50.0).floor().to_string() + "pt",
            );
            // TODO: why not implemented?
            // if line_spacing > 0.0 {
            //     dbg!(text);
            //     unimplemented!();
            // }
        }

        match text.paragraph_alignment() {
            ParagraphAlignment::Center => styles.set("text-align", "center".to_string()),
            ParagraphAlignment::Right => styles.set("text-align", "right".to_string()),
            _ => {}
        }

        styles
    }

    fn parse_style(&self, style: &ParagraphStyling) -> StyleSet {
        let mut styles = StyleSet::new();

        if style.bold() {
            styles.set("font-weight", "bold".to_string());
        }

        if style.italic() {
            styles.set("font-style", "italic".to_string());
        }

        if style.underline() {
            styles.set("text-decoration", "underline".to_string());
        }

        if style.superscript() {
            styles.set("vertical-align", "super".to_string());
        }

        if style.subscript() {
            styles.set("vertical-align", "sub".to_string());
        }

        if style.strikethrough() {
            styles.set("text-decoration", "line-through".to_string());
        }

        if let Some(font) = style.font() {
            styles.set("font-family", font.to_string());
        }

        if let Some(size) = style.font_size() {
            styles.set("font-size", ((size as f32) / 2.0).to_string() + "pt");
        }

        if let Some(ColorRef::Manual { r, g, b }) = style.font_color() {
            styles.set("color", format!("rgb({},{},{})", r, g, b));
        }

        if let Some(ColorRef::Manual { r, g, b }) = style.highlight() {
            styles.set("background-color", format!("rgb({},{},{})", r, g, b));
        }

        if style.paragraph_alignment().is_some() {
            unimplemented!()
        }

        if let Some(space) = style.paragraph_space_before() {
            if space != 0.0 {
                unimplemented!()
            }
        }

        if let Some(space) = style.paragraph_space_after() {
            if space != 0.0 {
                unimplemented!()
            }
        }

        if let Some(space) = style.paragraph_line_spacing_exact() {
            if space != 0.0 {
                unimplemented!()
            }

            if let Some(size) = style.font_size() {
                styles.set(
                    "line-height",
                    format!("{}px", (size as f32 * 1.2 / 72.0 * 48.0).floor()),
                )
            }
        }

        if style.math_formatting() {
            // FIXME: Handle math formatting
            // See https://docs.microsoft.com/en-us/windows/win32/api/richedit/ns-richedit-gettextex
            // for unicode chars used
            // unimplemented!()
        }

        styles
    }
}

fn is_tag(tag: &str) -> bool {
    !matches!(tag, "PageDateTime" | "PageTitle")
}

fn fix_newlines(text: &str) -> String {
    static REGEX_LEADING_SPACES: Lazy<Regex> =
        Lazy::new(|| Regex::new(r"<br>(\s+)").expect("failed to compile regex"));

    let text = text
        .replace("\u{000b}", "<br>")
        .replace("\n", "<br>")
        .replace("\r", "<br>");

    REGEX_LEADING_SPACES
        .replace_all(&text, |captures: &Captures| {
            "<br>".to_string() + &"&nbsp;".repeat(captures[1].len())
        })
        .to_string()
}
