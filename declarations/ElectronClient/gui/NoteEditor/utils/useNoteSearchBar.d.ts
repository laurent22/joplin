/// <reference types="react" />
import { SearchMarkers } from './useSearchMarkers';
interface LocalSearch {
    query: string;
    selectedIndex: number;
    resultCount: number;
    searching: boolean;
    timestamp: number;
}
export default function useNoteSearchBar(): {
    localSearch: LocalSearch;
    onChange: (query: string) => void;
    onNext: () => void;
    onPrevious: () => void;
    onClose: () => void;
    setResultCount: (count: number) => void;
    showLocalSearch: boolean;
    setShowLocalSearch: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    searchMarkers: () => SearchMarkers;
};
export {};
