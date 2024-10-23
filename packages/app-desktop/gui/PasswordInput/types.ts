
export interface ChangeEvent {
	value: string;
}

export type ChangeEventHandler = (event: ChangeEvent)=> void;
