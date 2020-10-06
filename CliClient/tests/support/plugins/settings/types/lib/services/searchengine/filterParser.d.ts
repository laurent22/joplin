interface Term {
    name: string;
    value: string;
    negated: boolean;
    quoted?: boolean;
    wildcard?: boolean;
}
export default function filterParser(searchString: string): Term[];
export {};
