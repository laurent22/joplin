use crate::page::Renderer;
use crate::utils::{AttributeSet, StyleSet, html_entities, px, url_encode};
use color_eyre::Result;
use itertools::Itertools;
use once_cell::sync::Lazy;
use parser::contents::{EmbeddedObject, RichText};
use parser::property::common::ColorRef;
use parser::property::rich_text::{MathExpression, ParagraphAlignment, ParagraphStyling};
use parser_utils::log_warn;
use regex::{Captures, Regex};

impl<'a> Renderer<'a> {
    pub(crate) fn render_rich_text(&mut self, text: &RichText) -> Result<String> {
        let mut content_html = String::new();
        let mut attrs = AttributeSet::new();
        let mut style = self.parse_paragraph_styles(text);

        if let Some((note_tag_html, note_tag_styles)) = self.render_note_tags(text.note_tags()) {
            content_html.push_str(&note_tag_html);
            style.extend(note_tag_styles);
        }

        content_html.push_str(&self.parse_content(text)?);

        if content_html.starts_with("http://") || content_html.starts_with("https://") {
            content_html = format!("<a href=\"{}\">{}</a>", url_encode(&content_html), content_html);
        }

        if style.len() > 0 {
            attrs.set("style", style.to_string());
        }

        match text.paragraph_style().style_id() {
            Some(t) if !self.in_list && is_tag(t) => {
                Ok(format!("<{} {}>{}</{}>", t, attrs, content_html, t))
            }
            _ if style.len() > 0 => Ok(format!("<span {}>{}</span>", style.to_html_attr(), content_html)),
            _ => Ok(content_html),
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

        let parts = data.text_segments();
        // Stores LaTeX and original text data
        let mut math_parts: Vec<MathExpression> = Vec::new();

        let content = parts
            .iter()
            .map(|part| -> Result<String> {
                let style = part
                    .style()
                    .map(|style| self.parse_style(style))
                    .unwrap_or_default();
                if let Some(hyperlink) = part.hyperlink() {
                    let hyperlink_start_html = if hyperlink.is_link_start {
                        format!(
                            "<a href=\"{}\" {}>",
                            url_encode(&hyperlink.href),
                            style.to_html_attr(),
                        )
                    } else {
                        String::from("")
                    };
                    let hyperlink_end_html = if hyperlink.is_link_end { "</a>" } else { "" };

                    let content_html = html_entities(part.text());
                    Ok(format!(
                        "{hyperlink_start_html}{content_html}{hyperlink_end_html}"
                    ))
                } else if let Some(math) = part.math() {
                    if math.is_math_start {
                        math_parts.clear();
                    }
                    math_parts.push(math.clone());

                    if math.is_math_end {
                        Ok(self.render_math(&math_parts, &style)?)
                    } else {
                        Ok("".into())
                    }
                } else {
                    let text_html = html_entities(part.text());
                    if style.len() > 0 {
                        let style_attr = style.to_html_attr();
                        Ok(format!("<span {style_attr}>{text_html}</span>"))
                    } else {
                        Ok(text_html)
                    }
                }
            })
            .collect::<Result<String>>()?;

        let content = fix_newlines(&content);
        if content.is_empty() {
            Ok(String::from("&nbsp;"))
        } else {
            Ok(content)
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

        if let Some(align) = &style.paragraph_alignment() {
            styles.set(
                "text-align",
                match align {
                    ParagraphAlignment::Center => "center",
                    ParagraphAlignment::Left => "left",
                    ParagraphAlignment::Right => "right",
                    other => {
                        log_warn!("Unknown/unsupported text-align value: {:?}", other);
                        ""
                    }
                }
                .into(),
            );
        }

        if let Some(space) = style.paragraph_space_before() {
            if space != 0.0 {
                // Space is in half inches:
                styles.set("margin-top", format!("{}in", space / 2.));
            }
        }

        if let Some(space) = style.paragraph_space_after() {
            if space != 0.0 {
                styles.set("margin-bottom", format!("{}in", space / 2.));
            }
        }

        if let Some(space) = style.paragraph_line_spacing_exact() {
            if space != 0.0 {
                styles.set("line-height", format!("{}in", space / 2.))
            } else if let Some(size) = style.font_size() {
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
