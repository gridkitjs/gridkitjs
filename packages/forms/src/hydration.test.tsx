// @vitest-environment jsdom
import { formatText, textParser } from "@gridkitjs/forms-core";
import { act, createRef } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  useFieldInput,
  type FieldInputKind,
  type FieldInputProps,
  type InputHandle,
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

describe("a field input hydrating", () => {
  beforeAll(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("hydrates server markup without a mismatch, then follows the field", async () => {
    const handle = createRef<InputHandle<string>>();
    const onChange = vi.fn();
    const container = document.createElement("div");
    container.innerHTML = renderToString(
      <NameInput defaultValue="Ada" name="name" />,
    );
    document.body.append(container);

    const error = vi.spyOn(console, "error");
    const recoverable: unknown[] = [];
    const root = await act(() =>
      hydrateRoot(
        container,
        <NameInput
          defaultValue="Ada"
          name="name"
          handleRef={handle}
          onChange={onChange}
        />,
        {
          onRecoverableError: (cause) => {
            recoverable.push(cause);
          },
        },
      ),
    );
    expect(recoverable).toEqual([]);
    expect(error).not.toHaveBeenCalled();

    act(() => {
      handle.current?.setValue("Grace");
    });
    const [control, hidden] = container.querySelectorAll("input");
    expect(control?.value).toBe("Grace");
    expect(hidden?.value).toBe("Grace");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        value: "Grace",
        previousValue: "Ada",
        source: "api",
        nativeEvent: null,
      }),
    );
    act(() => {
      root.unmount();
    });
  });
});
