import { formatText, requiredRule, textParser } from "@gridkitjs/forms-core";
import { useMemo, type Ref } from "react";
import { useFieldContext } from "../field/fieldContext";
import { classNames } from "../field/parts";
import { useFormSettings } from "../settings";
import {
  useFieldInput,
  validatorsOf,
  type FieldInputKind,
} from "../useFieldInput";
import {
  ControlBox,
  densityClass,
  hasNode,
  InputFrame,
  joinIds,
  OwnMessages,
  SearchIcon,
  useOwnMessagesId,
} from "./parts";
import type { TextInputBaseProps } from "./textInputProps";

export interface SearchInputProps extends TextInputBaseProps<string> {
  /**
   * Milliseconds typing must pause before the text is read
   * (`onBeforeChange`, `onChange`, `onValidate`); `onInput` fires at once,
   * and Enter reads at once. None by default.
   */
  readonly debounce?: number | undefined;
  readonly ref?: Ref<HTMLInputElement> | undefined;
}

const SEARCH_TEXT: FieldInputKind<string> = {
  defaultParse: textParser(),
  defaultFormat: formatText,
  serialize: (value) => value,
};

function SearchInputControl({
  debounce = 0,
  required,
  validate,
  loading = false,
  density,
  autoFocus,
  placeholder,
  prefix,
  suffix,
  clearable = true,
  selectOnFocus = false,
  inputMode,
  enterKeyHint = "search",
  autoComplete,
  controlProps: extraControlProps,
  className,
  style,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...props
}: SearchInputProps) {
  const field = useFieldContext();
  const settings = useFormSettings();
  const needsValue = required === true || field?.required === true;
  const validators = useMemo(
    () => [
      ...(needsValue ? [requiredRule<string>()] : []),
      ...validatorsOf(validate),
    ],
    [needsValue, validate],
  );

  const input = useFieldInput(
    { ...props, required, validate: validators, ref },
    SEARCH_TEXT,
    {
      startAdornment: true,
      changeDelay: debounce,
      selectOnFocus,
      escape: "clear",
    },
  );
  const { controlProps } = input;
  const strings = settings.messages;
  const resolvedDensity = density ?? settings.density;
  const controlId = controlProps.id;
  const prefixId = `${controlId}-prefix`;
  const suffixId = `${controlId}-suffix`;
  const ownMessagesId = useOwnMessagesId(controlId);
  const root = classNames(
    "gridkit-forms-search-input",
    densityClass(resolvedDensity),
    className,
  );

  if (input.mode === "display") {
    return (
      <div className={root} style={style}>
        {input.displayValue}
        {input.hiddenInput}
      </div>
    );
  }

  const editable = !controlProps.readOnly && !controlProps.disabled;
  return (
    <div className={root} style={style}>
      <ControlBox
        severity={input.severity}
        disabled={controlProps.disabled === true}
        readOnly={controlProps.readOnly === true}
        loading={loading}
        density={resolvedDensity}
        start={
          <span className="gridkit-forms-search-input-icon" aria-hidden="true">
            <SearchIcon />
          </span>
        }
        prefix={prefix}
        prefixId={prefixId}
        suffix={suffix}
        suffixId={suffixId}
        clear={
          clearable && editable && input.text !== ""
            ? {
                label: strings.clear,
                onClear: (event) => {
                  input.clear(event.nativeEvent);
                },
              }
            : null
        }
      >
        <input
          {...extraControlProps}
          {...controlProps}
          type="search"
          className="gridkit-forms-search-input-control"
          placeholder={placeholder ?? strings.searchPlaceholder}
          autoFocus={autoFocus}
          inputMode={inputMode}
          enterKeyHint={enterKeyHint}
          autoComplete={autoComplete}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-describedby={joinIds(
            hasNode(prefix) && prefixId,
            hasNode(suffix) && suffixId,
            controlProps["aria-describedby"],
            ownMessagesId,
            ariaDescribedBy,
          )}
          aria-busy={loading || undefined}
        />
      </ControlBox>
      {input.hiddenInput}
      <OwnMessages
        id={`${controlId}-messages`}
        messages={input.messages}
        strings={strings}
        named={ariaLabel !== undefined || ariaLabelledBy !== undefined}
      />
    </div>
  );
}

/**
 * A search box: `<input type="search">` (role `searchbox`) with a search
 * icon and a clear button, on the same machinery as `TextInput`. Its value
 * is a string, `null` when empty. Enter commits at once, reading the text
 * first even while a `debounce` is pending; Escape empties it, after
 * `onClear`, and passes on when it is already empty.
 *
 * Search on `onChange` with a `debounce` as the user types, or on
 * `onCommit` for "search on Enter".
 */
export function SearchInput(props: SearchInputProps) {
  return (
    <InputFrame
      label={props.label}
      description={props.description}
      id={props.id}
      mode={props.mode}
      density={props.density}
      readOnly={props.readOnly}
      disabled={props.disabled}
    >
      <SearchInputControl {...props} />
    </InputFrame>
  );
}
