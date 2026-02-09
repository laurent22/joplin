use crate::utils::{StyleSet, html_entities};
use askama::Template;
use color_eyre::Result;
use color_eyre::eyre::WrapErr;
use itertools::Itertools;
use std::collections::HashMap;

#[derive(Template)]
#[template(path = "page.html", escape = "none")]
struct PageTemplate<'a> {
    page_id_attr: &'a str,
    name: &'a str,
    content: &'a str,
    global_styles: Vec<(&'a String, &'a StyleSet)>,
}

pub(crate) fn render(
    page_id: &str,
    name: &str,
    content: &str,
    global_styles: &HashMap<String, StyleSet>,
) -> Result<String> {
    PageTemplate {
        content,
        name: &html_entities(name),
        page_id_attr: &html_entities(page_id),
        global_styles: global_styles
            .iter()
            .sorted_by(|(a, _), (b, _)| Ord::cmp(a, b))
            .collect(),
    }
    .render()
    .wrap_err("Failed to render page template")
}
