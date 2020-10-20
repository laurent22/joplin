import * as React from 'react';
import { CommandDeclaration, CommandRuntime, CommandContext } from 'lib/services/CommandService';

export const declaration:CommandDeclaration = {
	name: 'showModalMessage',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async (_context:CommandContext, message:string) => {
			comp.setState({
				modalLayer: {
					visible: true,
					message:
						<div className="modal-message">
							<div id="loading-animation" />
							<div className="text">{message}</div>
						</div>,
				},
			});
		},
	};
};
