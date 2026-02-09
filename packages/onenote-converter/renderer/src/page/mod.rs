use crate::utils::StyleSet;
use crate::{page::ink::InkBuilder, section};
use color_eyre::Result;
use parser::page::{Page, PageContent};
use std::collections::{HashMap, HashSet};

pub(crate) mod content;
pub(crate) mod embedded_file;
pub(crate) mod image;
pub(crate) mod ink;
pub(crate) mod list;
pub(crate) mod math;
pub(crate) mod note_tag;
pub(crate) mod outline;
pub(crate) mod rich_text;
pub(crate) mod table;

pub(crate) struct Renderer<'a> {
    output: String,
    section: &'a mut section::Renderer,

    in_list: bool,
    global_styles: HashMap<String, StyleSet>,
    global_classes: HashSet<String>,
}

impl<'a> Renderer<'a> {
    pub(crate) fn new(output: String, section: &'a mut section::Renderer) -> Self {
        Self {
            output,
            section,
            in_list: false,
            global_styles: HashMap::new(),
            global_classes: HashSet::new(),
        }
    }

    pub(crate) fn render_page(&mut self, page: &Page) -> Result<String> {
        let title_text = page.title_text().unwrap_or("Untitled Page".to_string());

        let mut content = String::new();

        if let Some(title) = page.title() {
            let mut styles = StyleSet::new();
            styles.set("position", "absolute".to_string());
            styles.set(
                "top",
                format!("{}px", (title.offset_vertical() * 48.0 + 24.0).round()),
            );
            styles.set(
                "left",
                format!("{}px", (title.offset_horizontal() * 48.0 + 48.0).round()),
            );

            let mut title_field = format!("<div class=\"title\" style=\"{}\">", styles);

            for outline in title.contents() {
                title_field.push_str(&self.render_outline(outline)?)
            }

            title_field.push_str("</div>");

            content.push_str(&title_field);
        }

        let page_content = self.render_page_contents(page.contents())?;
        content.push_str(&page_content);

        crate::templates::page::render(
            &page.link_target_id(),
            &title_text,
            &content,
            &self.global_styles,
        )
    }

    pub(crate) fn gen_class(&mut self, prefix: &str) -> String {
        let mut i = 0;

        loop {
            let class = format!("{}-{}", prefix, i);
            if !self.global_classes.contains(&class) {
                self.global_classes.insert(class.clone());

                return class;
            }

            i += 1;
        }
    }

    fn render_page_contents(&mut self, contents: &[PageContent]) -> Result<String> {
        let mut result = vec![];
        let mut ink_builder = InkBuilder::new(false);

        for content in contents {
            if !matches!(content, PageContent::Ink(_)) {
                result.push(ink_builder.finish());
            }

            match content {
                PageContent::Outline(outline) => {
                    result.push(self.render_outline(outline)?);
                }
                PageContent::Image(image) => {
                    result.push(self.render_image(image)?);
                }
                PageContent::EmbeddedFile(file) => {
                    result.push(self.render_embedded_file(file)?);
                }
                PageContent::Ink(ink) => {
                    ink_builder.push(ink, None);
                }
                PageContent::Unknown => {}
            }
        }
        result.push(ink_builder.finish());

        Ok(result.join(""))
    }
}
