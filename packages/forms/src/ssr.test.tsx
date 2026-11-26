import { formatText, textParser } from "@gridkitjs/forms-core";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
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
  const field = useFieldInput(props, TEXT);
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
      '<input aria-label="Name" value="Ada"/><input type="hidden" name="name" value="Ada"/>',
    );
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("renders a controlled value, and `null` as empty", () => {
    expect(renderToString(<NameInput value="Grace" />)).toBe(
      '<input aria-label="Name" value="Grace"/>',
    );
    expect(renderToString(<NameInput value={null} name="name" />)).toBe(
      '<input aria-label="Name" value=""/><input type="hidden" name="name" value=""/>',
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
