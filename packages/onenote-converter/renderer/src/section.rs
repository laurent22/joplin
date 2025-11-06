use crate::{page, templates};
use color_eyre::eyre::Result;
use parser::section::Section;
use parser_utils::fs_driver;
use parser_utils::log;
use std::collections::HashSet;

pub(crate) struct Renderer {
    pub(crate) files: HashSet<String>,
    pub(crate) pages: HashSet<String>,
}

impl Renderer {
    pub fn new() -> Self {
        Renderer {
            files: Default::default(),
            pages: Default::default(),
        }
    }

    pub fn render(&mut self, section: &Section, output_dir: String) -> Result<String> {
        let section_dir = fs_driver().join(
            output_dir.as_str(),
            sanitize_filename::sanitize(section.display_name()).as_str(),
        );
        log!(
            "section_dir: {:?} \n output_dir: {:?}",
            section_dir,
            output_dir
        );

        log!("Rendering section: {:?}", section_dir);
        fs_driver().make_dir(section_dir.as_str())?;

        let mut toc = Vec::new();
        let mut fallback_title_index = 0;

        for page_series in section.page_series() {
            for page in page_series.pages() {
                let title = page.title_text().map(|s| s.to_string()).unwrap_or_else(|| {
                    fallback_title_index += 1;

                    format!("Untitled Page {}", fallback_title_index)
                });

                let file_name = title.trim().replace("/", "_");
                let file_name = self.determine_page_filename(&file_name)?;
                let file_name = sanitize_filename::sanitize(file_name + ".html");

                let page_path = fs_driver().join(section_dir.as_str(), file_name.as_str());

                let mut renderer = page::Renderer::new(section_dir.clone(), self);
                let page_html = renderer.render_page(page)?;

                log!("Creating page file: {:?}", page_path);
                fs_driver().write_file(&page_path, page_html.as_bytes())?;

                let page_path_without_basedir =
                    String::from(fs_driver().remove_prefix(&page_path, output_dir.as_str()));
                toc.push((title, page_path_without_basedir, page.level()))
            }
        }

        let toc_html = templates::section::render(section.display_name(), toc)?;
        let toc_file = fs_driver().join(
            output_dir.as_str(),
            format!("{}.html", section.display_name()).as_str(),
        );
        log!("ToC: {:?}", toc_file);
        fs_driver().write_file(toc_file.as_str(), toc_html.as_bytes())?;

        Ok(section_dir)
    }

    pub(crate) fn determine_page_filename(&mut self, filename: &str) -> Result<String> {
        let mut i = 0;
        let mut current_filename = sanitize_filename::sanitize(filename);

        loop {
            if !self.pages.contains(&current_filename) {
                self.pages.insert(current_filename.clone());

                return Ok(current_filename);
            }

            i += 1;

            current_filename = format!("{}_{}", filename, i);
        }
    }
}
