'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const react_1 = require('react');
const KeymapService_1 = require('../../../lib/services/KeymapService');
const keymapService = KeymapService_1.default.instance();
const useCommandStatus = () => {
	const [status, setStatus] = react_1.useState(() => keymapService.getCommandNames().reduce((accumulator, command) => {
		accumulator[command] = false;
		return accumulator;
	}, {}));
	const disableStatus = (commandName) => setStatus(prevStatus => (Object.assign(Object.assign({}, prevStatus), { [commandName]: false })));
	const enableStatus = (commandName) => setStatus(prevStatus => {
		// Falsify all the commands; Only one command should be truthy at any given time
		const newStatus = Object.keys(prevStatus).reduce((accumulator, command) => {
			accumulator[command] = false;
			return accumulator;
		}, {});
		// Make the appropriate command truthful
		newStatus[commandName] = true;
		return newStatus;
	});
	return [status, enableStatus, disableStatus];
};
exports.default = useCommandStatus;
// # sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlQ29tbWFuZFN0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInVzZUNvbW1hbmRTdGF0dXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxpQ0FBaUM7QUFDakMsdUVBQWdFO0FBRWhFLE1BQU0sYUFBYSxHQUFHLHVCQUFhLENBQUMsUUFBUSxFQUFFLENBQUM7QUFNL0MsTUFBTSxnQkFBZ0IsR0FBRyxHQUFrRixFQUFFO0lBQzVHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLEdBQUcsZ0JBQVEsQ0FBZ0IsR0FBRyxFQUFFLENBQ3hELGFBQWEsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUEwQixFQUFFLE9BQWUsRUFBRSxFQUFFO1FBQ3RGLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxLQUFLLENBQUM7UUFDN0IsT0FBTyxXQUFXLENBQUM7SUFDcEIsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUNOLENBQUM7SUFFRixNQUFNLGFBQWEsR0FBRyxDQUFDLFdBQW1CLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLGlDQUFNLFVBQVUsS0FBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEtBQUssSUFBRyxDQUFDLENBQUM7SUFDbEgsTUFBTSxZQUFZLEdBQUcsQ0FBQyxXQUFtQixFQUFFLEVBQUUsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUU7UUFDcEUsZ0ZBQWdGO1FBQ2hGLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBMEIsRUFBRSxPQUFlLEVBQUUsRUFBRTtZQUNoRyxXQUFXLENBQUMsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDO1lBQzdCLE9BQU8sV0FBVyxDQUFDO1FBQ3BCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVQLHdDQUF3QztRQUN4QyxTQUFTLENBQUMsV0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQzlCLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUMsQ0FBQyxDQUFDO0lBRUgsT0FBTyxDQUFDLE1BQU0sRUFBRSxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDO0FBRUYsa0JBQWUsZ0JBQWdCLENBQUMifQ==
