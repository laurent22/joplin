use crate::page::{Renderer, ink::InkBuilder};
use color_eyre::Result;
use log::warn;
// use crate::something_else::contents::Content;
use parser::contents::Content;

impl<'a> Renderer<'a> {
    pub(crate) fn render_contents(&mut self, contents: &[Content]) -> Result<String> {
        let mut result = vec![];
        let mut ink_builder = InkBuilder::new(false);

        for content in contents {
            if !matches!(content, Content::Ink(_)) {
                result.push(ink_builder.finish());
            }

            match content {
                Content::RichText(text) => {
                    result.push(self.render_rich_text(text)?);
                }
                Content::Image(image) => {
                    result.push(self.render_image(image)?);
                }
                Content::EmbeddedFile(file) => {
                    result.push(self.render_embedded_file(file)?);
                }
                Content::Table(table) => {
                    result.push(self.render_table(table)?);
                }
                Content::Ink(ink) => {
                    ink_builder.push(ink, None);
                }
                Content::Unknown => {
                    warn!("Page with unknown content");
                }
            }
        }

        result.push(ink_builder.finish());
        Ok(result.join(""))
    }
}
