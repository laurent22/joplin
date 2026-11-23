import emojiRegex from 'emoji-regex';

const firstEmoji = (input: string): string => input.trim().match(emojiRegex())?.[0] ?? '';

export default firstEmoji;
