'use strict';
const __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
	function adopt(value) { return value instanceof P ? value : new P(function(resolve) { resolve(value); }); }
	return new (P || (P = Promise))(function(resolve, reject) {
		function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
		function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
		function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
		step((generator = generator.apply(thisArg, _arguments || [])).next());
	});
};
Object.defineProperty(exports, '__esModule', { value: true });
const react_1 = require('react');
const KeymapService_1 = require('../../../lib/services/KeymapService');
const keymapService = KeymapService_1.default.instance();
// This custom hook provides a synchronized snapshot of the keymap residing at KeymapService
// All the logic regarding altering and interacting with the keymap is isolated from the components
const useKeymap = () => {
	const [keymapItems, setKeymapItems] = react_1.useState(() => keymapService.getKeymapItems());
	const [keymapError, setKeymapError] = react_1.useState(null);
	const setAccelerator = (commandName, accelerator) => {
		setKeymapItems(prevKeymap => {
			const newKeymap = [...prevKeymap];
			newKeymap.find(item => item.command === commandName).accelerator = accelerator || null /* Disabled */;
			return newKeymap;
		});
	};
	const resetAccelerator = (commandName) => {
		const defaultAccelerator = keymapService.getDefaultAccelerator(commandName);
		setKeymapItems(prevKeymap => {
			const newKeymap = [...prevKeymap];
			newKeymap.find(item => item.command === commandName).accelerator = defaultAccelerator;
			return newKeymap;
		});
	};
	const overrideKeymapItems = (customKeymapItems) => {
		const oldKeymapItems = [...customKeymapItems];
		keymapService.initialize(); // Start with a fresh keymap
		try {
			// First, try to update the in-memory keymap of KeymapService
			// This function will throw if there are any issues with the new custom keymap
			keymapService.overrideKeymap(customKeymapItems);
			// Then, update the state with the data from KeymapService
			// Side-effect: Changes will also be saved to the disk
			setKeymapItems(keymapService.getKeymapItems());
		} catch (err) {
			// oldKeymapItems includes even the unchanged keymap items
			// However, it is not an issue because the logic accounts for such scenarios
			keymapService.overrideKeymap(oldKeymapItems);
			throw err;
		}
	};
	const exportCustomKeymap = (customKeymapPath) => __awaiter(void 0, void 0, void 0, function* () {
		// KeymapService is already synchronized automatically with the in-state keymap
		yield keymapService.saveCustomKeymap(customKeymapPath);
	});
	react_1.useEffect(() => {
		try {
			keymapService.overrideKeymap(keymapItems);
			keymapService.saveCustomKeymap();
			setKeymapError(null);
		} catch (err) {
			setKeymapError(err);
		}
	}, [keymapItems]);
	return [keymapItems, keymapError, overrideKeymapItems, exportCustomKeymap, setAccelerator, resetAccelerator];
};
exports.default = useKeymap;
// # sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlS2V5bWFwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXNlS2V5bWFwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQUEsaUNBQTRDO0FBQzVDLHVFQUFnRjtBQUVoRixNQUFNLGFBQWEsR0FBRyx1QkFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBRS9DLDRGQUE0RjtBQUM1RixtR0FBbUc7QUFFbkcsTUFBTSxTQUFTLEdBQUcsR0FPaEIsRUFBRTtJQUNILE1BQU0sQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLEdBQUcsZ0JBQVEsQ0FBZSxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztJQUNuRyxNQUFNLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxHQUFHLGdCQUFRLENBQVEsSUFBSSxDQUFDLENBQUM7SUFFNUQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxXQUFtQixFQUFFLFdBQW1CLEVBQUUsRUFBRTtRQUNuRSxjQUFjLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDM0IsTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDO1lBRWxDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxLQUFLLFdBQVcsQ0FBQyxDQUFDLFdBQVcsR0FBRyxXQUFXLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQztZQUN0RyxPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQztJQUVGLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxXQUFtQixFQUFFLEVBQUU7UUFDaEQsTUFBTSxrQkFBa0IsR0FBRyxhQUFhLENBQUMscUJBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDNUUsY0FBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQzNCLE1BQU0sU0FBUyxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsQ0FBQztZQUVsQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sS0FBSyxXQUFXLENBQUMsQ0FBQyxXQUFXLEdBQUcsa0JBQWtCLENBQUM7WUFDdEYsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUM7SUFFRixNQUFNLG1CQUFtQixHQUFHLENBQUMsaUJBQStCLEVBQUUsRUFBRTtRQUMvRCxNQUFNLGNBQWMsR0FBRyxDQUFDLEdBQUcsaUJBQWlCLENBQUMsQ0FBQztRQUM5QyxhQUFhLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyw0QkFBNEI7UUFFeEQsSUFBSTtZQUNILDZEQUE2RDtZQUM3RCw4RUFBOEU7WUFDOUUsYUFBYSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ2hELDBEQUEwRDtZQUMxRCxzREFBc0Q7WUFDdEQsY0FBYyxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1NBQy9DO1FBQUMsT0FBTyxHQUFHLEVBQUU7WUFDYiwwREFBMEQ7WUFDMUQsNEVBQTRFO1lBQzVFLGFBQWEsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDN0MsTUFBTSxHQUFHLENBQUM7U0FDVjtJQUNGLENBQUMsQ0FBQztJQUVGLE1BQU0sa0JBQWtCLEdBQUcsQ0FBTyxnQkFBd0IsRUFBRSxFQUFFO1FBQzdELCtFQUErRTtRQUMvRSxNQUFNLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3hELENBQUMsQ0FBQSxDQUFDO0lBRUYsaUJBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDZCxJQUFJO1lBQ0gsYUFBYSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUMxQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUNqQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDckI7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNiLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztTQUNwQjtJQUNGLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFFbEIsT0FBTyxDQUFDLFdBQVcsRUFBRSxXQUFXLEVBQUUsbUJBQW1CLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixDQUFDLENBQUM7QUFDOUcsQ0FBQyxDQUFDO0FBRUYsa0JBQWUsU0FBUyxDQUFDIn0=
