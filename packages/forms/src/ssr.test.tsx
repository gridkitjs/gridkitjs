import { formatText, textParser } from "@gridkitjs/forms-core";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Checkbox,
  Field,
  FieldGroup,
  Fieldset,
  Form,
  FormLayout,
  FormSection,
  MessageSummary,
  NumberRangeInput,
  Switch,
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

describe("a form on the server", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders its structure, a collapsed section hidden and no summary", () => {
    const error = vi.spyOn(console, "error");
    const html = renderToString(
      <Form aria-label="Order" density="compact" labelWidth="12rem">
        <MessageSummary />
        <FormSection
          id="delivery"
          title="Delivery"
          collapsible
          defaultExpanded={false}
        >
          <Fieldset legend="Address" span={2}>
            <FormLayout columns={2}>
              <Field id="city" label="City" span="full" message="Enter a city">
                <FieldInput />
              </Field>
              <FieldGroup id="postal" label="Postal code">
                <FieldInput />
              </FieldGroup>
            </FormLayout>
          </Fieldset>
        </FormSection>
      </Form>,
    );
    expect(html).toContain(
      '<form noValidate="" aria-label="Order" class="gridkit-forms-form is-compact" style="--gridkit-forms-label-width:12rem">',
    );
    expect(html).not.toContain("gridkit-forms-message-summary");
    expect(html).toContain(
      '<button type="button" class="gridkit-forms-section-toggle" aria-expanded="false" aria-controls="delivery-body">',
    );
    expect(html).toContain(
      '<div class="gridkit-forms-section-body" id="delivery-body" hidden="">',
    );
    expect(html).toContain('class="gridkit-forms-fieldset is-span-2"');
    expect(html).toContain('class="gridkit-forms-layout is-columns-2"');
    expect(html).toContain(
      'class="gridkit-forms-field is-label-top is-error is-compact is-span-full"',
    );
    expect(html).toContain(
      '<div id="postal" role="group" aria-labelledby="postal-label" class="gridkit-forms-field gridkit-forms-field-group is-label-top is-compact">',
    );
    expect(error).not.toHaveBeenCalled();
  });
});

describe("a toggle on the server", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a checked checkbox with its label and submitted value", () => {
    const error = vi.spyOn(console, "error");
    const html = renderToString(
      <Checkbox
        id="news"
        label="Send me the newsletter"
        name="news"
        defaultValue
      />,
    );
    expect(html).toContain('<label class="gridkit-forms-checkbox is-checked">');
    expect(html).toContain(
      '<input id="news" aria-describedby="news-messages" type="checkbox" class="gridkit-forms-checkbox-control" checked=""/>',
    );
    expect(html).toContain(
      '<span class="gridkit-forms-checkbox-label">Send me the newsletter</span>',
    );
    expect(html).toContain('<input type="hidden" name="news" value="true"/>');
    expect(error).not.toHaveBeenCalled();
  });

  it("marks a null checkbox mixed and submits it empty", () => {
    const html = renderToString(
      <Checkbox aria-label="All" name="all" defaultValue={null} />,
    );
    expect(html).toContain('class="gridkit-forms-checkbox is-mixed"');
    expect(html).toContain('<input type="hidden" name="all" value=""/>');
  });

  it("renders a switch, off unless given, and shows its state in display mode", () => {
    expect(
      renderToString(<Switch aria-label="Alerts" name="alerts" />),
    ).toContain('role="switch"');
    expect(
      renderToString(<Switch aria-label="Alerts" name="alerts" />),
    ).toContain('<input type="hidden" name="alerts" value="false"/>');
    expect(
      renderToString(<Switch label="Alerts" mode="display" defaultValue />),
    ).toContain('<span class="gridkit-forms-display-value">On</span>');
  });
});

describe("a number range on the server", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders both ends in a group, each named From or To, and submits each end", () => {
    const error = vi.spyOn(console, "error");
    const html = renderToString(
      <NumberRangeInput
        id="price"
        label="Price"
        locale="en-US"
        name="price"
        defaultValue={{ start: 1200, end: null }}
      />,
    );
    expect(html).toContain(
      'class="gridkit-forms-number-range-input" role="group" aria-labelledby="price-label"',
    );
    expect(html).toContain(
      'id="price" class="gridkit-forms-number-input-control gridkit-forms-range-start"',
    );
    expect(html).toContain('value="1,200"');
    expect(html).toContain('aria-labelledby="price-label price-start-label"');
    expect(html).toContain('aria-labelledby="price-label price-end-label"');
    expect(html).toContain(
      '<input type="hidden" name="price.start" value="1200"/>',
    );
    expect(html).toContain('<input type="hidden" name="price.end" value=""/>');
    expect(error).not.toHaveBeenCalled();
  });

  it("shows an open range in display mode", () => {
    expect(
      renderToString(
        <NumberRangeInput
          label="Price"
          locale="en-US"
          mode="display"
          defaultValue={{ start: null, end: 20 }}
        />,
      ),
    ).toContain('<span class="gridkit-forms-display-value">up to 20</span>');
  });
});
