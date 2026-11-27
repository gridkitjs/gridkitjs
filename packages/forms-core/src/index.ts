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
  createCompositeController,
  type AssembleContext,
  type CompositeController,
  type CompositeDetailsContext,
  type CompositeFieldOptions,
  type CompositeState,
  type PartChange,
  type PartController,
  type PartOptions,
  type PartTexts,
  type PartValues,
} from "./field/createCompositeController";
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
  InputFilter,
  InputFilterDecision,
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
  applyMaskEdit,
  formatMasked,
  isValidMaskStart,
  maskDetails,
  type MaskDetails,
  type MaskEdit,
  type MaskedText,
  type MaskOptions,
  type MaskResult,
  type MaskSource,
  type MaskValueFormat,
} from "./mask/applyMask";
export {
  compileMask,
  type CompiledMask,
  type MaskCompileResult,
  type MaskLetterCase,
  type MaskSlot,
  type MaskTokenDefinition,
  type MaskTokens,
} from "./mask/grammar";
export {
  filterMaskEdit,
  maskFormatter,
  maskInputHints,
  maskParser,
  type MaskInputHints,
} from "./mask/maskField";
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
  cleanPastedNumber,
  type CleanedNumber,
} from "./number/cleanPastedNumber";
export {
  addDecimals,
  compareDecimals,
  decimalToNumber,
  isDecimalString,
  normalizeDecimal,
  numberToDecimal,
  roundDecimal,
  shiftDecimal,
  subtractDecimals,
  type DecimalString,
  type NumberLike,
  type RoundingMode,
} from "./number/decimal";
export {
  formatNumber,
  formatNumberRange,
  numberAffixes,
  type NumberAffixes,
  type NumberTextForm,
} from "./number/formatNumber";
export {
  fixedFractionDigits,
  filterNumberEdit,
  numberCaret,
  type NumberEntry,
  type NumberEntryOptions,
} from "./number/numberEntry";
export {
  numberDetails,
  numberFormatter,
  numberParser,
  stepNumberValue,
  type NumberDetails,
  type NumberFieldOptions,
  type NumberStep,
} from "./number/numberField";
export {
  numberFractionDigits,
  type FractionDigits,
  type NegativeStyle,
  type NumberOptions,
  type NumberStyle,
  type NumberValue,
  type NumberValueType,
  type PercentScale,
} from "./number/options";
export {
  parseNumber,
  type NumberReading,
  type NumberUnreadableReason,
} from "./number/parseNumber";
export {
  decimalRangeKind,
  numberRangeKind,
  numberRangeKindOf,
} from "./number/numberRange";
export type { NumberReadingInfo } from "./number/reading";
export { maxRule, minRule, stepRule } from "./number/rules";
export {
  stepNumber,
  type StepDirection,
  type StepRequest,
  type StepSize,
} from "./number/stepNumber";
export {
  numberSymbols,
  type NumberSymbolOverrides,
  type NumberSymbols,
} from "./number/symbols";
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
  isRelativeRange,
  orderRange,
  rangeFlags,
  rangeIncludes,
  rangeSpan,
  resolveRange,
  sameRange,
  shownEnd,
  type NoFlags,
  type Range,
  type RangeBounds,
  type RangeEnd,
  type RangeKind,
  type RangeOptions,
  type RangeOrientation,
  type RangeReading,
  type RangeValue,
  type RelativeRange,
} from "./range/range";
export {
  rangeDetails,
  rangeEnds,
  readRangeEnds,
  type RangeDetails,
  type RangeEnds,
} from "./range/rangeField";
export {
  endsRule,
  maxSpanRule,
  minSpanRule,
  type SpanFormatter,
} from "./range/rules";
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
