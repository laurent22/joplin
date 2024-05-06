import CommandService from '@joplin/lib/services/CommandService';
import { useEffect } from 'react';

import commands from '../commands';
import { SidebarCommandRuntimeProps } from '../types';

interface Props {
	focusSidebar: ()=> void;
}
const useSidebarCommandHandler = ({ focusSidebar }: Props) => {
	useEffect(() => {
		const runtimeProps: SidebarCommandRuntimeProps = {
			focusSidebar,
		};

		CommandService.instance().componentRegisterCommands(runtimeProps, commands);

		return () => {
			CommandService.instance().componentUnregisterCommands(commands);
		};
	}, [focusSidebar]);
};

export default useSidebarCommandHandler;
