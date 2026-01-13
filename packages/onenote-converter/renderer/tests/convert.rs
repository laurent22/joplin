use renderer::convert;
use std::fs;
use std::path::PathBuf;

struct TestResources {
    output_dir: PathBuf,
    test_data_dir: PathBuf,
}

fn setup(test_id: &str) -> TestResources {
    let output_dir = PathBuf::from("./test-output").join(test_id);

    if output_dir.exists() {
        fs::remove_dir_all(&output_dir).unwrap();
    }
    fs::create_dir_all(&output_dir).unwrap();

    let test_data_dir = PathBuf::from("../test-data/");
    assert!(test_data_dir.exists());

    TestResources {
        output_dir: fs::canonicalize(output_dir).unwrap(),
        test_data_dir: fs::canonicalize(test_data_dir).unwrap(),
    }
}

#[test]
fn convert_web_export() {
    let TestResources {
        output_dir,
        test_data_dir,
    } = setup("web_export");
    let test_data_dir = test_data_dir.join("single-page");

    convert(
        &test_data_dir.join("Untitled Section.one").to_string_lossy(),
        &output_dir.to_string_lossy(),
        &test_data_dir.to_string_lossy(),
    )
    .unwrap();

    // Should create a table of contents file
    assert!(output_dir.join("Untitled Section.html").exists());
    // Should convert the input page to an HTML file
    assert!(
        output_dir
            .join("Untitled Section")
            .join("test.html")
            .exists()
    );
}

#[test]
fn convert_desktop_export() {
    let TestResources {
        output_dir,
        test_data_dir,
    } = setup("desktop_export");
    let test_data_dir = test_data_dir.join("onenote-2016");

    convert(
        &test_data_dir.join("OneWithFileData.one").to_string_lossy(),
        &output_dir.to_string_lossy(),
        &test_data_dir.to_string_lossy(),
    )
    .unwrap();

    // Should create a table of contents file
    assert!(output_dir.join("OneWithFileData.html").exists());
    // Should convert the input page to an HTML file
    assert!(
        output_dir
            .join("OneWithFileData")
            .join("Untitled Page 1.html")
            .exists()
    );
}

#[test]
fn convert_page_versions() {
    let TestResources {
        output_dir,
        test_data_dir,
    } = setup("page_versions");

    convert(
        &test_data_dir.join("Page versions.one").to_string_lossy(),
        &output_dir.to_string_lossy(),
        &test_data_dir.to_string_lossy(),
    )
    .unwrap();

    // Should create a table of contents file
    assert!(output_dir.join("Page versions.html").exists());
    // Should convert the input page to an HTML file
    assert!(
        output_dir
            .join("Page versions")
            .join("Test!.html")
            .exists()
    );
}

#[test]
fn convert_onepkg() {
    let TestResources {
        output_dir,
        test_data_dir,
    } = setup("onepkg");

    convert(
        &test_data_dir.join("onepkg").join("migration-test-notebook.onepkg").to_string_lossy(),
        &output_dir.to_string_lossy(),
        &test_data_dir.to_string_lossy(),
    )
    .unwrap();

    // Should create folders for each section
    assert!(output_dir.join("Ma Section 1.one").exists());
    assert!(output_dir.join("Ma section 2.one").exists());
    assert!(output_dir.join("Procédures.one").exists());

    // Should create HTML files
    let procedures_export = output_dir.join("Procédures.one");
    assert!(procedures_export.join("Procédures.html").exists());
    assert!(procedures_export.join("Procédures").join("Tuto vidéo - partage Carnet de notes Joplin.html").exists());
}
