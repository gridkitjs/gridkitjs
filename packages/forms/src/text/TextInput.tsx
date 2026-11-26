import {
  countCharacters,
  counterAnnouncement,
  formatText,
  maxLengthRule,
  minLengthRule,
  patternRule,
  requiredRule,
  textParser,
  type FormsMessages,
} from "@gridkitjs/forms-core";
import {
  attachAutoGrow,
  scheduleTimeout,
  type AttachedAutoGrow,
  type TextControl,
} from "@gridkitjs/forms-dom";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from "react";
import { DisplayValue } from "../DisplayValue";
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
  EyeIcon,
  hasNode,
  InputFrame,
  joinIds,
  keepFocus,
  OwnMessages,
  useControlElement,
  useOwnMessagesId,
} from "./parts";
import type { TextInputBaseProps } from "./textInputProps";

export interface TextInputProps extends TextInputBaseProps<
  string,
  TextControl
> {
  /**
   * `"password"` hides the text and adds a reveal button. Email, phone and
   * URL keyboards come from `inputMode` and `autoComplete`: a native
   * `type="email"` would add the browser's own validation.
   */
  readonly type?: "text" | "password" | undefined;
  /** A `<textarea>` that grows with its text. */
  readonly multiline?: boolean | undefined;
  /** Multiline: the lines shown when empty. */
  readonly minRows?: number | undefined;
  /** Multiline: the lines it grows to, before it scrolls. */
  readonly maxRows?: number | undefined;
  /**
   * The most characters (code points) the value may have. Typing past it
   * is allowed: the counter marks the overflow and the field shows an
   * error.
   */
  readonly maxLength?: number | undefined;
  readonly minLength?: number | undefined;
  /** The whole value must match. */
  readonly pattern?: RegExp | undefined;
  /** The "12/50" counter under the box; on whenever `maxLength` is set. */
  readonly showCounter?: boolean | undefined;
  /**
   * Upper-cases the value as it is read, in the field's locale. The text is
   * shown upper-cased by CSS, so the caret never moves and input methods
   * are left alone; a commit writes the upper-cased text.
   */
  readonly uppercase?: boolean | undefined;
  /** Drops leading and trailing whitespace from the value; never for a password. */
  readonly trim?: boolean | undefined;
  /** The reveal button of a password; on by default. */
  readonly revealable?: boolean | undefined;
  /** Escape puts back the last committed text; on by default. */
  readonly revertOnEscape?: boolean | undefined;
  readonly ref?: Ref<TextControl> | undefined;
}

/** How long typing must pause before the counter is announced. */
const ANNOUNCE_DELAY = 1000;

/** What a password shows in display mode, whatever its length. */
const HIDDEN_PASSWORD = "••••••••";

const DEFAULT_MIN_ROWS = 2;
const DEFAULT_MAX_ROWS = 8;

/**
 * The "12/50" under the box, hidden from screen readers, which read the
 * limit with the control instead ("Up to 50 characters") and hear what is
 * left once typing pauses near it, never on every keystroke.
 */
function CharacterCounter({
  labelId,
  count,
  max,
  typing,
  strings,
}: {
  readonly labelId: string;
  readonly count: number;
  readonly max: number;
  /** The user is editing: only their typing is announced. */
  readonly typing: boolean;
  readonly strings: FormsMessages;
}) {
  // Stamped with the count it was made for, so the next keystroke empties
  // it and the same words are announced again after the next pause.
  const [announced, setAnnounced] = useState({ count: -1, text: "" });
  const lastCount = useRef(count);
  useEffect(() => {
    if (count === lastCount.current) {
      return undefined;
    }
    lastCount.current = count;
    const text = typing ? counterAnnouncement(count, max, strings) : null;
    if (text === null) {
      return undefined;
    }
    return scheduleTimeout(() => {
      setAnnounced({ count, text });
    }, ANNOUNCE_DELAY);
  }, [count, max, typing, strings]);

  return (
    <>
      <div
        className={classNames(
          "gridkit-forms-text-input-counter",
          count > max && "is-over-limit",
        )}
        aria-hidden="true"
      >
        {strings.counter(count, max)}
      </div>
      <span className="gridkit-forms-sr-only" id={labelId}>
        {strings.counterLabel(max)}
      </span>
      <span className="gridkit-forms-sr-only" aria-live="polite">
        {announced.count === count ? announced.text : ""}
      </span>
    </>
  );
}

function TextInputControl({
  type = "text",
  multiline = false,
  minRows = DEFAULT_MIN_ROWS,
  maxRows = DEFAULT_MAX_ROWS,
  maxLength,
  minLength,
  pattern,
  showCounter = maxLength !== undefined,
  uppercase = false,
  trim = false,
  revealable = true,
  revertOnEscape = true,
  required,
  validate,
  loading = false,
  density,
  autoFocus,
  placeholder,
  prefix,
  suffix,
  clearable = false,
  selectOnFocus = false,
  inputMode,
  enterKeyHint,
  autoComplete,
  controlProps: extraControlProps,
  className,
  style,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...props
}: TextInputProps) {
  const field = useFieldContext();
  const settings = useFormSettings();
  const password = type === "password";
  const needsValue = required === true || field?.required === true;

  const kind = useMemo<FieldInputKind<string>>(
    () => ({
      defaultParse: textParser({ uppercase, trim: trim && !password }),
      defaultFormat: formatText,
      serialize: (value) => value,
    }),
    [uppercase, trim, password],
  );
  const validators = useMemo(
    () => [
      ...(needsValue ? [requiredRule<string>()] : []),
      ...(minLength === undefined ? [] : [minLengthRule(minLength)]),
      ...(maxLength === undefined ? [] : [maxLengthRule(maxLength)]),
      ...(pattern === undefined ? [] : [patternRule(pattern)]),
      ...validatorsOf(validate),
    ],
    [needsValue, minLength, maxLength, pattern, validate],
  );

  const [element, controlRef] = useControlElement(ref);
  const input = useFieldInput(
    { ...props, required, validate: validators, ref: controlRef },
    kind,
    {
      startAdornment: hasNode(prefix),
      selectOnFocus,
      escape: revertOnEscape ? "revert" : "none",
    },
  );
  const { controlProps } = input;
  const strings = settings.messages;
  const resolvedDensity = density ?? settings.density;
  const controlId = controlProps.id;
  const prefixId = `${controlId}-prefix`;
  const suffixId = `${controlId}-suffix`;
  const counterLabelId = `${controlId}-counter-label`;
  const ownMessagesId = useOwnMessagesId(controlId);

  const [revealed, setRevealed] = useState(false);
  const selection = useRef<readonly [number, number] | null>(null);
  useLayoutEffect(() => {
    const kept = selection.current;
    selection.current = null;
    if (kept !== null && element instanceof HTMLInputElement) {
      // Chromium rebuilds a text control at the first layout after its
      // `type` changes, dropping the selection, so lay out first.
      element.getBoundingClientRect();
      element.setSelectionRange(kept[0], kept[1]);
    }
  }, [revealed, element]);

  const autoGrow = useRef<AttachedAutoGrow | null>(null);
  useLayoutEffect(() => {
    if (!(element instanceof HTMLTextAreaElement)) {
      return undefined;
    }
    const attached = attachAutoGrow(element, { minRows, maxRows });
    autoGrow.current = attached;
    return () => {
      attached.detach();
      autoGrow.current = null;
    };
  }, [element, minRows, maxRows]);
  // Text written from code (a clear, a revert, a value from the app) fires
  // no `input` for it to follow.
  useLayoutEffect(() => {
    autoGrow.current?.update();
  }, [input.text]);

  const display = input.mode === "display";
  const root = classNames(
    "gridkit-forms-text-input",
    multiline && "is-multiline",
    uppercase && "is-uppercase",
    densityClass(resolvedDensity),
    className,
  );
  const ownMessages = (
    <OwnMessages
      id={`${controlId}-messages`}
      messages={input.messages}
      strings={strings}
      named={ariaLabel !== undefined || ariaLabelledBy !== undefined}
    />
  );

  if (display) {
    return (
      <div className={root} style={style}>
        {password ? (
          <DisplayValue
            text={input.text === "" ? "" : HIDDEN_PASSWORD}
            emptyText={strings.emptyValue}
          />
        ) : (
          input.displayValue
        )}
        {input.hiddenInput}
      </div>
    );
  }

  const count = countCharacters(input.text);
  const counter =
    showCounter && maxLength !== undefined ? (
      <CharacterCounter
        labelId={counterLabelId}
        count={count}
        max={maxLength}
        typing={input.state.phase.kind !== "idle"}
        strings={strings}
      />
    ) : null;
  const editable = !controlProps.readOnly && !controlProps.disabled;
  const sharedProps = {
    ...extraControlProps,
    ...controlProps,
    className: "gridkit-forms-text-input-control",
    placeholder,
    autoFocus,
    inputMode,
    enterKeyHint,
    autoComplete,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": joinIds(
      hasNode(prefix) && prefixId,
      hasNode(suffix) && suffixId,
      counter !== null && counterLabelId,
      controlProps["aria-describedby"],
      ownMessagesId,
      ariaDescribedBy,
    ),
    "aria-busy": loading || undefined,
  };

  return (
    <div className={root} style={style}>
      <ControlBox
        severity={input.severity}
        disabled={controlProps.disabled === true}
        readOnly={controlProps.readOnly === true}
        loading={loading}
        density={resolvedDensity}
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
        end={
          password && revealable ? (
            <button
              type="button"
              className={classNames(
                "gridkit-forms-text-input-reveal",
                revealed && "is-revealed",
              )}
              aria-pressed={revealed}
              aria-controls={controlId}
              aria-label={strings.showPassword}
              disabled={controlProps.disabled}
              onPointerDown={keepFocus}
              onMouseDown={keepFocus}
              onClick={() => {
                if (
                  element instanceof HTMLInputElement &&
                  element.ownerDocument.activeElement === element
                ) {
                  selection.current = [
                    element.selectionStart ?? 0,
                    element.selectionEnd ?? 0,
                  ];
                }
                setRevealed((current) => !current);
              }}
            >
              <EyeIcon />
            </button>
          ) : null
        }
      >
        {multiline ? (
          <textarea {...sharedProps} rows={minRows} />
        ) : (
          <input
            {...sharedProps}
            type={password && !revealed ? "password" : "text"}
          />
        )}
      </ControlBox>
      {counter}
      {input.hiddenInput}
      {ownMessages}
    </div>
  );
}

/**
 * A text field: a single line, a password with a reveal button, or a
 * multiline `<textarea>` that grows with its text. Its value is a string,
 * `null` when empty. It draws the box the grid's controls share, with
 * optional prefix and suffix adornments, a clear button, a spinner and a
 * character counter, and takes every shared input prop: display mode,
 * `readOnly`, `disabled`, messages with their severity, density and the
 * events of `@gridkitjs/forms`.
 *
 * Inside a `Field` it takes the field's label, description and messages;
 * outside one, `label` and `description` draw a `Field` around it.
 */
export function TextInput(props: TextInputProps) {
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
      <TextInputControl {...props} />
    </InputFrame>
  );
}
