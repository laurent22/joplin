import uuid from '../../uuid';

// Whiteboard nodes and edges need stable, opaque identifiers. We use the
// project's standard short-uuid generator (alphanumeric, 22 chars) so IDs
// are short enough to read in the JSON but still safely unique.
const generateId = (): string => uuid.createNano();

export default generateId;
