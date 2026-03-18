import { ChangeEvent as ReactChangeEvent } from 'react';

export type ChangeEvent = ReactChangeEvent<HTMLInputElement>;
export type ChangeEventHandler = (event: ChangeEvent)=> void;
