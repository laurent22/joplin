use crate::parser::section::Section;
use crate::utils::{make_dir, write_file};
use crate::{page, templates};
use color_eyre::eyre::Result;
use std::collections::HashSet;
use std::path::{Path, PathBuf};

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

    pub fn render(&mut self, section: &Section, output_dir: &Path) -> Result<PathBuf> {
        let section_dir = output_dir.join(sanitize_filename::sanitize(section.display_name()));

        let _ = make_dir(section_dir.as_os_str().to_str().unwrap());

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

                let output_file = section_dir.join(file_name);

                let mut renderer = page::Renderer::new(section_dir.clone(), self);
                let output = renderer.render_page(page)?;

                let path_as_str = output_file.as_os_str().to_str().unwrap();
                let _ = write_file(path_as_str, output.as_bytes());

                toc.push((
                    title,
                    output_file
                        .strip_prefix(&output_dir)?
                        .to_string_lossy()
                        .to_string(),
                    page.level(),
                ))
            }
        }

        let toc_html = templates::section::render(section.display_name(), toc)?;
        let toc_file = output_dir.join(format!("{}.html", section.display_name()));
        let path_as_str = toc_file.as_os_str().to_str().unwrap();
        let _ = write_file(path_as_str, toc_html.as_bytes());

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
