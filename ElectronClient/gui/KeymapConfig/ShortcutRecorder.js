'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const React = require('react');
const react_1 = require('react');
const KeymapService_1 = require('../../lib/services/KeymapService');
const styles_1 = require('./styles');
const { _ } = require('lib/locale');
const keymapService = KeymapService_1.default.instance();
exports.ShortcutRecorder = ({ onSave, onReset, onCancel, onError, initialAccelerator, commandName, themeId }) => {
	const styles = styles_1.default(themeId);
	const [accelerator, setAccelerator] = react_1.useState(initialAccelerator);
	const [saveAllowed, setSaveAllowed] = react_1.useState(true);
	react_1.useEffect(() => {
		try {
			// Only perform validations if there's an accelerator provided
			// Otherwise performing a save means that it's going to be disabled
			if (accelerator) {
				keymapService.validateAccelerator(accelerator);
				keymapService.validateKeymap({ accelerator, command: commandName });
			}
			// Discard previous errors
			onError({ recorderError: null });
			setSaveAllowed(true);
		} catch (recorderError) {
			onError({ recorderError });
			setSaveAllowed(false);
		}
	}, [accelerator]);
	const handleKeydown = (event) => {
		event.preventDefault();
		const newAccelerator = keymapService.domToElectronAccelerator(event);
		switch (newAccelerator) {
		case 'Enter':
			if (saveAllowed) { return onSave({ commandName, accelerator }); }
			break;
		case 'Escape':
			return onCancel({ commandName });
		case 'Backspace':
		case 'Delete':
			return setAccelerator('');
		default:
			setAccelerator(newAccelerator);
		}
	};
	return (React.createElement('div', { style: styles.recorderContainer },
		React.createElement('input', { value: accelerator, placeholder: _('Press the shortcut'), onKeyDown: handleKeydown, style: styles.recorderInput, readOnly: true, autoFocus: true }),
		React.createElement('button', { style: styles.inlineButton, disabled: !saveAllowed, onClick: () => onSave({ commandName, accelerator }) }, _('Save')),
		React.createElement('button', { style: styles.inlineButton, onClick: () => onReset({ commandName }) }, _('Restore')),
		React.createElement('button', { style: styles.inlineButton, onClick: () => onCancel({ commandName }) }, _('Cancel'))));
};
// # sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2hvcnRjdXRSZWNvcmRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlNob3J0Y3V0UmVjb3JkZXIudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQStCO0FBQy9CLGlDQUEyRDtBQUUzRCxvRUFBNkQ7QUFDN0QscUNBQStCO0FBRS9CLE1BQU0sRUFBRSxDQUFDLEVBQUUsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDcEMsTUFBTSxhQUFhLEdBQUcsdUJBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQVlsQyxRQUFBLGdCQUFnQixHQUFHLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBeUIsRUFBRSxFQUFFO0lBQzNJLE1BQU0sTUFBTSxHQUFHLGdCQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFaEMsTUFBTSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsR0FBRyxnQkFBUSxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDbkUsTUFBTSxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsR0FBRyxnQkFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRXJELGlCQUFTLENBQUMsR0FBRyxFQUFFO1FBQ2QsSUFBSTtZQUNILDhEQUE4RDtZQUM5RCxtRUFBbUU7WUFDbkUsSUFBSSxXQUFXLEVBQUU7Z0JBQ2hCLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDL0MsYUFBYSxDQUFDLGNBQWMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQzthQUNwRTtZQUVELDBCQUEwQjtZQUMxQixPQUFPLENBQUMsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNqQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDckI7UUFBQyxPQUFPLGFBQWEsRUFBRTtZQUN2QixPQUFPLENBQUMsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1lBQzNCLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUN0QjtJQUNGLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFFbEIsTUFBTSxhQUFhLEdBQUcsQ0FBQyxLQUFvQyxFQUFFLEVBQUU7UUFDOUQsS0FBSyxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVyRSxRQUFRLGNBQWMsRUFBRTtZQUN4QixLQUFLLE9BQU87Z0JBQ1gsSUFBSSxXQUFXO29CQUFFLE9BQU8sTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7Z0JBQzdELE1BQU07WUFDUCxLQUFLLFFBQVE7Z0JBQ1osT0FBTyxRQUFRLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1lBQ2xDLEtBQUssV0FBVyxDQUFDO1lBQ2pCLEtBQUssUUFBUTtnQkFDWixPQUFPLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMzQjtnQkFDQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUM7U0FDL0I7SUFDRixDQUFDLENBQUM7SUFFRixPQUFPLENBQ04sNkJBQUssS0FBSyxFQUFFLE1BQU0sQ0FBQyxpQkFBaUI7UUFDbkMsK0JBQ0MsS0FBSyxFQUFFLFdBQVcsRUFDbEIsV0FBVyxFQUFFLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUNwQyxTQUFTLEVBQUUsYUFBYSxFQUN4QixLQUFLLEVBQUUsTUFBTSxDQUFDLGFBQWEsRUFDM0IsUUFBUSxRQUNSLFNBQVMsU0FDUjtRQUVGLGdDQUFRLEtBQUssRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFLFFBQVEsRUFBRSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxDQUFDLElBQzdHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FDRjtRQUNULGdDQUFRLEtBQUssRUFBRSxNQUFNLENBQUMsWUFBWSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxJQUN6RSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQ0w7UUFDVCxnQ0FBUSxLQUFLLEVBQUUsTUFBTSxDQUFDLFlBQVksRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsV0FBVyxFQUFFLENBQUMsSUFDMUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUNKLENBQ0osQ0FDTixDQUFDO0FBQ0gsQ0FBQyxDQUFDIn0=
