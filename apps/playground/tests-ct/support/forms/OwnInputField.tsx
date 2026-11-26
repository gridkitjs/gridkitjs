import { useEffect, useState } from "react";
import { Field, useField } from "@gridkitjs/forms";

/**
 * An app's own input, a plain controlled `<input>`, wired to its field
 * through `useField`: it reports a warning while its text is "bad", and its
 * focus and emptiness, which the floating label follows.
 */
function OwnInput() {
  const { controlProps, reportMessages, reportControlState } = useField();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    reportMessages(
      text === "bad"
        ? { text: "That code is unusual", severity: "warning" }
        : null,
    );
  }, [reportMessages, text]);
  useEffect(() => {
    reportControlState({ focused, empty: text === "" });
  }, [reportControlState, focused, text]);

  return (
    <input
      {...controlProps}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
      }}
      onFocus={() => {
        setFocused(true);
      }}
      onBlur={() => {
        setFocused(false);
      }}
    />
  );
}

/** A required "Code" field with a floating label around the app's own input. */
export default function OwnInputField() {
  return (
    <Field
      label="Code"
      description="Six letters"
      labelPosition="floating"
      required
    >
      <OwnInput />
    </Field>
  );
}
