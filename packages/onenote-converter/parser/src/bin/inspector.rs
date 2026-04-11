
use std::{env::{self, Args}, path::PathBuf, process::exit};

use parser::Parser;

pub fn main() {
    let config = match Config::from_args(&mut env::args()) {
        Ok(config) => config,
        Err(error) => {
            print_help_text(&error.program_name, error.reason);
            exit(1)
        }
    };

    let input_path_string = &config.input_file.to_string_lossy();
    eprintln!("Reading {}", input_path_string);
    let data = match std::fs::read(&config.input_file) {
        Ok(data) => data,
        Err(error) => {
            let error = format!("File read error: {error}");
            print_help_text(&config.program_name, &error);
            exit(2)
        }
    };

    let mut parser = Parser::new();
    let parsed_section = match parser.parse_section_from_data(&data, &input_path_string) {
        Ok(section) => section,
        Err(error) => {
            let error = format!("Parse error: {error}");
            print_help_text(&config.program_name, &error);
            exit(3)
        }
    };

    // TODO: Debug output is unstable. Document this or switch to a different output formatter
    println!("{:#?}", parsed_section);
}

fn print_help_text(program_name: &str, error: &str) {
    let error_section = if error.is_empty() {
        ""
    } else {
        error
    };

    eprintln!("Usage: {program_name} <input_file>\n{error_section}");
}

struct ConfigParseError {
    reason: &'static str,
    program_name: String,
}

struct Config {
    input_file: PathBuf,
    program_name: String,
}

impl Config {
    pub fn from_args(args: &mut Args) -> Result<Self, ConfigParseError> {
        let Some(program_name) = &args.next() else {
            return Err(ConfigParseError { reason: "Missing program name", program_name: "??".into() })
        };
        let program_name = program_name.to_string();
        let Some(input_file) = &args.next() else {
            return Err(ConfigParseError { reason: "Not enough arguments", program_name })
        };

        Ok(Config {
            input_file: input_file.into(),
            program_name
        })
    }
}
