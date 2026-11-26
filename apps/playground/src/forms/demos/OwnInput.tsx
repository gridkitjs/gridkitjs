import { useEffect, useState } from "react";
import { useField } from "@gridkitjs/forms";
import { useEventReporter } from "../eventLog";

const INPUT_CLASS =
  "w-full rounded border border-gridkit-fg-muted bg-gridkit-surface px-2 py-1 text-gridkit-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gridkit-accent disabled:opacity-60";

/**
 * An app's own `<input>` wired to its `Field` through `useField`: it needs
 * a value and shows its error once revealed, by leaving it or by the form's
 * submit through `onReveal`, and refuses a submit while empty through
 * `setCustomValidity`. It reports its changes and reveals to the log under
 * `component`.
 */
export function OwnInput({
  component,
  name,
}: {
  readonly component: string;
  readonly name: string;
}) {
  const reporter = useEventReporter(component);
  const [text, setText] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [control, setControl] = useState<HTMLInputElement | null>(null);
  const { controlProps, mode, reportMessages, reportControlState } = useField({
    onReveal: () => {
      setRevealed(true);
      reporter("onReveal")({ value: text });
    },
  });
  const error = text === "" ? "Enter a reference" : null;

  useEffect(() => {
    control?.setCustomValidity(error ?? "");
  }, [control, error]);
  useEffect(() => {
    reportMessages(revealed ? error : null);
  }, [reportMessages, revealed, error]);
  useEffect(() => {
    reportControlState({ focused, empty: text === "", required: true });
  }, [reportControlState, focused, text]);

  if (mode === "display") {
    return <span>{text === "" ? "–" : text}</span>;
  }
  return (
    <input
      {...controlProps}
      ref={setControl}
      name={name}
      className={INPUT_CLASS}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        reporter("onChange")({
          value: event.target.value,
          text: event.target.value,
          nativeEvent: event.nativeEvent,
        });
      }}
      onFocus={() => {
        setFocused(true);
      }}
      onBlur={() => {
        setFocused(false);
        setRevealed(true);
      }}
    />
  );
}
