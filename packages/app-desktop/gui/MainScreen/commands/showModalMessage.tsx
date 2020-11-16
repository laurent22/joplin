import * as React from 'react';
import { CommandDeclaration, CommandRuntime, CommandContext } from '@joplin/lib/services/CommandService';

export const declaration: CommandDeclaration = {
	name: 'showModalMessage',
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, message: string) => {
			let brIndex = 1;
			const lines = message.split('\n').map((line: string) => {
				if (!line.trim()) return <br key={`${brIndex++}`}/>;
				return <div key={line} className="text">{line}</div>;
			});

			comp.setState({
				modalLayer: {
					visible: true,
					message:
						<div className="modal-message">
							<div id="loading-animation" />
							<div className="text">
								{lines}
							</div>
						</div>,
				},
			});
		},
	};
};
