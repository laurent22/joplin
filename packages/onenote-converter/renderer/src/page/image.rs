use crate::page::Renderer;
use crate::utils::{AttributeSet, StyleSet, px};
use color_eyre::Result;
use parser::contents::Image;
use parser_utils::{fs_driver, log, log_warn};

impl<'a> Renderer<'a> {
    pub(crate) fn render_image(&mut self, image: &Image) -> Result<String> {
        let mut content = String::new();

        if let Some(data) = image.data() {
            let filename = self.determine_image_filename(image)?;
            let path = fs_driver().join(&self.output, &filename);
            log!("Rendering image: {:?}", path);
            fs_driver().write_file(&path, &data[..])?;

            let mut attrs = AttributeSet::new();
            let mut styles = StyleSet::new();

            attrs.set("src", filename);

            if let Some(text) = image.alt_text() {
                attrs.set("alt", text.to_string().replace('"', "&quot;"));
            }

            if let Some(width) = image.layout_max_width() {
                styles.set("max-width", px(width));
            }

            if let Some(height) = image.layout_max_height() {
                styles.set("max-height", px(height));
            }

            if image.offset_horizontal().is_some() || image.offset_vertical().is_some() {
                styles.set("position", "absolute".to_string());
            }

            if let Some(offset) = image.offset_horizontal() {
                styles.set("left", px(offset));
            }

            if let Some(offset) = image.offset_vertical() {
                styles.set("top", px(offset));
            }

            if styles.len() > 0 {
                attrs.set("style", styles.to_string());
            }

            content.push_str(&format!("<img {} />", attrs.to_string()));
        }

        Ok(self.render_with_note_tags(image.note_tags(), content))
    }

    fn determine_image_filename(&mut self, image: &Image) -> Result<String> {
        if let Some(name) = image.image_filename() {
            let filename = self.section.to_unique_safe_filename(&self.output, name)?;
            return Ok(filename);
        }

        let ext = image.extension().unwrap_or_else(|| {
            log_warn!("Image missing extension. Defaulting to .png.");
            ".png"
        });
        let filename = self
            .section
            .to_unique_safe_filename(&self.output, &format!("image{}", ext))?;
        Ok(filename)
    }
}
