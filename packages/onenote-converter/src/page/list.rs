use crate::page::Renderer;
use crate::parser::contents::{List, OutlineElement};
use crate::parser::property::common::ColorRef;
use crate::utils::{px, AttributeSet, StyleSet};
use color_eyre::Result;

const FORMAT_NUMBERED_LIST: char = '\u{fffd}';

impl<'a> Renderer<'a> {
    pub(crate) fn render_list<'b>(
        &mut self,
        elements: impl Iterator<Item = (&'b OutlineElement, u8, u8)>,
        indents: &[f32],
    ) -> Result<String> {
        let mut contents = String::new();
        let mut in_list = false;
        let mut list_end = None;

        for (element, parent_level, current_level) in elements {
            if !in_list && self.is_list(element) {
                let tags = self.list_tags(element);
                let list_start = tags.0;
                list_end = Some(tags.1);

                contents.push_str(&list_start);
                in_list = true;
            }

            if in_list && !self.is_list(element) {
                contents.push_str(&list_end.take().expect("no list end tag defined"));
                in_list = false;
            }

            contents.push_str(&self.render_outline_element(
                element,
                parent_level,
                current_level,
                indents,
            )?);
        }

        if in_list {
            contents.push_str(&list_end.expect("no list end tag defined"));
        }

        Ok(contents)
    }

    pub(crate) fn list_tags(&mut self, element: &OutlineElement) -> (String, String) {
        let list = element
            .list_contents()
            .first()
            .expect("no list contents defined");

        let tag = if self.is_numbered_list(list) {
            "ol"
        } else {
            "ul"
        };
        let attrs = self.list_attrs(list, element.list_spacing());

        (format!("<{} {}>", tag, attrs), format!("</{}>", tag))
    }

    fn list_attrs(&mut self, list: &List, spacing: Option<f32>) -> AttributeSet {
        let mut attrs = AttributeSet::new();
        let mut container_style = StyleSet::new();
        let mut item_style = StyleSet::new();
        let mut marker_style = StyleSet::new();

        let mut list_font = list.list_font();
        let mut list_format = list.list_format();
        let mut font_size = list.font_size();

        self.fix_wingdings(&mut list_font, &mut list_format, &mut font_size);

        match list_format {
            [FORMAT_NUMBERED_LIST, '\u{0}', ..] => {}
            [FORMAT_NUMBERED_LIST, '\u{1}', ..] => {
                container_style.set("list-style-type", "upper-roman".to_string())
            }
            [FORMAT_NUMBERED_LIST, '\u{2}', ..] => {
                container_style.set("list-style-type", "lower-roman".to_string())
            }
            [FORMAT_NUMBERED_LIST, '\u{3}', ..] => {
                container_style.set("list-style-type", "upper-latin".to_string())
            }
            [FORMAT_NUMBERED_LIST, '\u{4}', ..] => {
                container_style.set("list-style-type", "lower-latin".to_string())
            }
            [FORMAT_NUMBERED_LIST, c, ..] => {
                dbg!(c);
                unimplemented!();
            }
            [c] => marker_style.set("content", format!("'{}'", c)),
            _ => {}
        }

        let bullet_spacing = spacing.unwrap_or(0.2);

        item_style.set("padding-left", px(bullet_spacing));

        container_style.set("position", "relative".to_string());
        container_style.set("left", px(-bullet_spacing));

        if let Some(font) = list_font {
            marker_style.set("font-family", font.to_string());
        }

        if let Some(font) = list.font() {
            marker_style.set("font-family", font.to_string());
        }

        if let Some(ColorRef::Manual { r, g, b }) = list.font_color() {
            marker_style.set("color", format!("rgb({},{},{})", r, g, b));
        }

        if let Some(size) = font_size {
            marker_style.set("font-size", ((size as f32) / 2.0).to_string() + "pt");
        }

        if let Some(restart) = list.list_restart() {
            attrs.set("start", restart.to_string())
        }

        if container_style.len() > 0 {
            attrs.set("style", container_style.to_string());
        }

        let class = self.gen_class("list");

        if marker_style.len() > 0 {
            attrs.set("class", class.clone());

            self.global_styles
                .insert(format!(".{} li::marker", class), marker_style);
        }

        self.global_styles
            .insert(format!(".{} li", class), item_style);

        attrs
    }

    fn fix_wingdings(
        &self,
        list_font: &mut Option<&str>,
        list_format: &mut &[char],
        font_size: &mut Option<u16>,
    ) {
        match list_font.zip(list_format.first()) {
            // See http://www.alanwood.net/demos/wingdings.html
            Some(("Wingdings", '\u{a7}')) => *list_format = &['\u{25aa}'],
            Some(("Wingdings", '\u{a8}')) => *list_format = &['\u{25fb}'],
            Some(("Wingdings", '\u{77}')) => *list_format = &['\u{2b25}'],

            // See http://www.alanwood.net/demos/wingdings-2.html
            Some(("Wingdings 2", '\u{ae}')) => *list_format = &['\u{25c6}'],

            // See http://www.alanwood.net/demos/wingdings-3.html
            Some(("Wingdings 3", '\u{7d}')) => {
                *list_format = &['\u{25b6}'];
                *font_size = Some(18);
            }

            _ => return,
        }

        *list_font = Some("Calibri");
    }

    fn is_numbered_list(&self, list: &List) -> bool {
        list.list_format()
            .first()
            .map(|c| *c == FORMAT_NUMBERED_LIST)
            .unwrap_or_default()
    }

    pub(crate) fn is_list(&self, element: &OutlineElement) -> bool {
        element.list_contents().first().is_some()
    }
}
