use crate::utils::StyleSet;
use askama::Template;
use color_eyre::eyre::WrapErr;
use color_eyre::Result;
use itertools::Itertools;
use std::collections::HashMap;

#[derive(Template)]
#[template(path = "page.html", escape = "none")]
struct PageTemplate<'a> {
    name: &'a str,
    content: &'a str,
    global_styles: Vec<(&'a String, &'a StyleSet)>,
}

pub(crate) fn render(
    name: &str,
    content: &str,
    global_styles: &HashMap<String, StyleSet>,
) -> Result<String> {
    PageTemplate {
        name,
        content,
        global_styles: global_styles
            .iter()
            .sorted_by(|(a, _), (b, _)| Ord::cmp(a, b))
            .collect(),
    }
    .render()
    .wrap_err("Failed to render page template")
}
