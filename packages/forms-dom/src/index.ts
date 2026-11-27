// Browser behaviours a GridKit forms renderer attaches to its own controls.
// Each one owns its listeners and reports through callbacks or a forms-core
// controller, so it names no framework's types.
export {
  attachFocusGroup,
  type AttachedFocusGroup,
  type FocusGroupOptions,
} from "./form/attachFocusGroup";
export {
  attachEnterNavigation,
  compareDocumentOrder,
  findFirstInvalidControl,
  focusTargetIn,
} from "./form/formControls";
export { scheduleTimeout } from "./scheduleTimeout";
export {
  attachHoldRepeat,
  type AttachedHoldRepeat,
  type HoldRepeatOptions,
  type HoldRepeatState,
} from "./step/attachHoldRepeat";
export {
  attachStepKeys,
  type AttachedStepKeys,
  type StepKeysOptions,
} from "./step/attachStepKeys";
export {
  attachAutoGrow,
  type AttachedAutoGrow,
  type AutoGrowOptions,
} from "./text/attachAutoGrow";
export {
  attachTextInput,
  type AttachedTextInput,
  type TextControl,
  type TextInputController,
  type TextInputOptions,
} from "./text/attachTextInput";
export {
  attachToggle,
  type AttachedToggle,
  type ToggleOptions,
} from "./toggle/attachToggle";
