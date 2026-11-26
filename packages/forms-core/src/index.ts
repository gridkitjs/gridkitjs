// Form-input logic shared by every GridKit forms renderer: no DOM, no
// framework, and nothing from the grid packages.
export {
  booleanFormatter,
  booleanParser,
  CHECKBOX_WORDS,
  nextCheckedValue,
  SWITCH_WORDS,
  type BooleanWords,
} from "./boolean";
export {
  createFieldController,
  type FieldController,
  type FieldOptions,
} from "./field/createFieldController";
export type {
  ChangeSource,
  CommitTrigger,
  FieldBeforeChangeEvent,
  FieldBeforeCommitEvent,
  FieldBeforeInputEvent,
  FieldChangeEvent,
  FieldCommitEvent,
  FieldEventBase,
  FieldFocusEvent,
  FieldHandlers,
  FieldInputEvent,
  FieldValidateEvent,
  NoDetails,
  TextInputDetails,
} from "./field/events";
export { fieldReducer, type FieldAction } from "./field/fieldReducer";
export type {
  BeforeInputDecision,
  ChangeCause,
  CommitOutcome,
  TextEdit,
} from "./field/plan";
export {
  fieldMessages,
  fieldText,
  shownMessages,
  type FieldDraft,
  type FieldPhase,
  type FieldState,
  type TextReading,
} from "./field/state";
export {
  hasError,
  sortFieldMessages,
  toFieldMessages,
  type FieldMessage,
  type FieldMessageInput,
} from "./messages/fieldMessage";
export {
  createDefaultFormsMessages,
  defaultFormsMessages,
  resolveFormsMessages,
  type FormsMessages,
} from "./messages/formsMessages";
export { mostSevere, type Severity } from "./messages/severity";
export {
  parsed,
  unreadable,
  type FormatContext,
  type FormatPurpose,
  type Formatter,
  type ParseContext,
  type ParseResult,
  type Parser,
} from "./parse";
export {
  createFieldRegistry,
  summarizeMessages,
  type FieldRegistry,
  type MessageSummary,
  type RegisteredField,
  type SeverityCount,
  type SummaryItem,
} from "./registry";
export type { Schedule } from "./schedule";
export {
  countCharacters,
  counterAnnouncement,
  formatText,
  textParser,
  type TextParseOptions,
} from "./text";
export {
  checkedRule,
  maxLengthRule,
  minLengthRule,
  patternRule,
  requiredRule,
  type ValidationResult,
  type Validator,
  type ValidatorContext,
} from "./validation/validators";
