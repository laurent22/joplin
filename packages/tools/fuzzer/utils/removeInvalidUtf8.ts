
const removeInvalidUtf8 = (text: string) => new TextDecoder().decode(new TextEncoder().encode(text));
export default removeInvalidUtf8;
