import { formatText, textParser } from "@gridkitjs/forms-core";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Field,
  useFieldInput,
  type FieldInputKind,
  type FieldInputProps,
} from "./index";

const TEXT: FieldInputKind<string> = {
  defaultParse: textParser(),
  defaultFormat: formatText,
  serialize: (value) => value,
};

function NameInput(props: FieldInputProps<string>) {
  const field = useFieldInput({ id: "name", ...props }, TEXT);
  return (
    <>
      <input aria-label="Name" {...field.controlProps} />
      {field.hiddenInput}
    </>
  );
}

describe("a field input on the server", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the text in the control and the value in the hidden input", () => {
    const error = vi.spyOn(console, "error");
    const warn = vi.spyOn(console, "warn");
    const html = renderToString(<NameInput defaultValue="Ada" name="name" />);
    expect(html).toBe(
      '<input aria-label="Name" id="name" value="Ada"/><input type="hidden" name="name" value="Ada"/>',
    );
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("renders a controlled value, and `null` as empty", () => {
    expect(renderToString(<NameInput value="Grace" />)).toBe(
      '<input aria-label="Name" id="name" value="Grace"/>',
    );
    expect(renderToString(<NameInput value={null} name="name" />)).toBe(
      '<input aria-label="Name" id="name" value=""/><input type="hidden" name="name" value=""/>',
    );
  });

  it("disables the hidden input with the control, so neither is submitted", () => {
    const html = renderToString(
      <NameInput defaultValue="Ada" name="name" form="profile" disabled />,
    );
    const [control, hidden] = html.split("/>");
    expect(control).toContain('disabled=""');
    expect(hidden).toContain('type="hidden"');
    expect(hidden).toContain('form="profile"');
    expect(hidden).toContain('disabled=""');
  });
});

function FieldInput(props: FieldInputProps<string>) {
  const field = useFieldInput(props, TEXT);
  return (
    <>
      {field.mode === "display" ? (
        field.displayValue
      ) : (
        <input {...field.controlProps} />
      )}
      {field.hiddenInput}
    </>
  );
}

describe("a field on the server", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("names and describes its input, and marks it required", () => {
    const error = vi.spyOn(console, "error");
    const html = renderToString(
      <Field id="name" label="Name" description="As on your passport" required>
        <FieldInput defaultValue="Ada" />
      </Field>,
    );
    expect(html).toBe(
      [
        '<div class="gridkit-forms-field is-label-top is-required">',
        '<label class="gridkit-forms-field-label" id="name-label" for="name">Name',
        '<span class="gridkit-forms-field-required" aria-hidden="true">*</span></label>',
        '<div class="gridkit-forms-field-control">',
        '<input id="name" aria-describedby="name-description name-messages" aria-required="true" value="Ada"/>',
        "</div>",
        '<p class="gridkit-forms-field-description" id="name-description">As on your passport</p>',
        '<div class="gridkit-forms-field-messages" id="name-messages" aria-live="polite"></div>',
        "</div>",
      ].join(""),
    );
    expect(error).not.toHaveBeenCalled();
  });

  it("puts a floating label inside the control, resting while empty", () => {
    const html = renderToString(
      <Field id="email" label="Email" labelPosition="floating">
        <FieldInput />
      </Field>,
    );
    expect(html).toContain(
      '<div class="gridkit-forms-field is-label-floating"><div class="gridkit-forms-field-control"><label',
    );
  });

  it("shows the app's messages, most serious first, and takes the worst one's class", () => {
    const html = renderToString(
      <Field
        id="limit"
        label="Credit limit"
        message={[
          { text: "Above the usual", severity: "warning" },
          "Enter a number",
        ]}
      >
        <FieldInput />
      </Field>,
    );
    expect(html).toContain('class="gridkit-forms-field is-label-top is-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html.indexOf("Enter a number")).toBeLessThan(
      html.indexOf("Above the usual"),
    );
    expect(html).toContain(
      '<span class="gridkit-forms-sr-only">Warning: </span>',
    );
  });

  it("shows a value in display mode as text, in a group the label names", () => {
    const html = renderToString(
      <Field id="name" label="Name" mode="display">
        <FieldInput defaultValue="Ada Lovelace" name="name" />
      </Field>,
    );
    expect(html).toBe(
      [
        '<div class="gridkit-forms-field is-label-top is-display" role="group" aria-labelledby="name-label" aria-describedby="name-messages">',
        '<span class="gridkit-forms-field-label" id="name-label">Name</span>',
        '<div class="gridkit-forms-field-control">',
        '<span class="gridkit-forms-display-value">Ada Lovelace</span>',
        '<input type="hidden" name="name" value="Ada Lovelace"/>',
        "</div>",
        '<div class="gridkit-forms-field-messages" id="name-messages" aria-live="polite"></div>',
        "</div>",
      ].join(""),
    );
  });

  it("shows an empty value in display mode as a dash read as no value", () => {
    const html = renderToString(
      <Field label="Name" mode="display">
        <FieldInput />
      </Field>,
    );
    expect(html).toContain(
      '<span class="gridkit-forms-display-value gridkit-forms-display-empty"><span aria-hidden="true">—</span><span class="gridkit-forms-sr-only">No value</span></span>',
    );
  });
});
