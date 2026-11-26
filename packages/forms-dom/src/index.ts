// Browser behaviours a GridKit forms renderer attaches to its own controls.
// Each one owns its listeners and reports through callbacks or a forms-core
// controller, so it names no framework's types.
export {
  attachEnterNavigation,
  compareDocumentOrder,
  findFirstInvalidControl,
  focusTargetIn,
} from "./form/formControls";
export { scheduleTimeout } from "./scheduleTimeout";
export {
  attachAutoGrow,
  type AttachedAutoGrow,
  type AutoGrowOptions,
} from "./text/attachAutoGrow";
export {
  attachTextInput,
  type AttachedTextInput,
  type TextControl,
  type TextInputOptions,
} from "./text/attachTextInput";
