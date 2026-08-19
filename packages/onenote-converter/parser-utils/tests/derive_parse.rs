use parser_utils::{parse::Parse, reader::Reader};

#[derive(Parse)]
struct Test {
    #[pad_to_alignment(4)]
    a: u8,
    b: u8,
}

#[test]
fn test_parse() {
    let data: [u8; 5] = [1, 2, 3, 4, 5];
    let mut reader = Reader::new(&data);
    let parsed = Test::parse(&mut reader).unwrap();
    assert_eq!(parsed.a, 1);
    assert_eq!(parsed.b, 5);
    assert_eq!(reader.remaining(), 0);
}
