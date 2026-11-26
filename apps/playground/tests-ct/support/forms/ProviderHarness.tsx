import { useEffect, useState } from "react";
import {
  Field,
  Form,
  FormsProvider,
  TextInput,
  useField,
  type Density,
} from "@gridkitjs/forms";

/**
 * An app's own required `<input>`, "Code", that shows its error only once
 * it is revealed: by leaving it, or by the form's submit attempt through
 * `useField`'s `onReveal`. While empty it refuses a submit through
 * `setCustomValidity`.
 */
function RevealedOwnInput() {
  const [text, setText] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [control, setControl] = useState<HTMLInputElement | null>(null);
  const { controlProps, reportMessages } = useField({
    onReveal: () => {
      setRevealed(true);
    },
  });
  const error = text === "" ? "Enter a code" : null;

  useEffect(() => {
    control?.setCustomValidity(error ?? "");
  }, [control, error]);
  useEffect(() => {
    reportMessages(revealed ? error : null);
  }, [reportMessages, revealed, error]);

  return (
    <input
      {...controlProps}
      ref={setControl}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
      }}
      onBlur={() => {
        setRevealed(true);
      }}
    />
  );
}

export interface ProviderHarnessProps {
  readonly locale?: string;
  readonly density?: Density;
  /** The form's own density, which wins over the provider's. */
  readonly formDensity?: Density;
  /** Words for the counter in place of the default "3/10". */
  readonly wordyCounter?: boolean;
}

/**
 * A `FormsProvider` around a bare "Nickname" with a counter, outside any
 * form, and a `Form` holding "Note", with a counter, and the app's own
 * "Code". Each submit the form lets through counts in the "Submitted"
 * output.
 */
export default function ProviderHarness({
  locale,
  density,
  formDensity,
  wordyCounter = false,
}: ProviderHarnessProps) {
  const [submitted, setSubmitted] = useState(0);
  return (
    <FormsProvider
      locale={locale}
      density={density}
      messages={
        wordyCounter
          ? { counter: (count, max) => `${String(count)} of ${String(max)}` }
          : undefined
      }
    >
      <div>
        <TextInput label="Nickname" maxLength={10} defaultValue="Ada" />
        <Form
          aria-label="Order"
          density={formDensity}
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted((count) => count + 1);
          }}
        >
          <Field label="Note">
            <TextInput maxLength={10} defaultValue="abc" />
          </Field>
          <Field label="Code">
            <RevealedOwnInput />
          </Field>
          <button type="submit">Save</button>
        </Form>
        <output aria-label="Submitted">{submitted}</output>
      </div>
    </FormsProvider>
  );
}
