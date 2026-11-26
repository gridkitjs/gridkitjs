// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Field } from "./Field";
import { useField } from "./useField";

function OwnInput({ label }: { readonly label?: string }) {
  const { controlProps } = useField();
  return <input {...controlProps} aria-label={label} />;
}

function render(element: ReactNode): () => void {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return () => {
    act(() => {
      root.unmount();
    });
  };
}

describe("a field without a label", () => {
  beforeAll(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("warns once in development when its input has no aria-label either", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const unmountNamed = render(
      <Field>
        <OwnInput label="Search orders" />
      </Field>,
    );
    expect(warn).not.toHaveBeenCalled();
    unmountNamed();

    const unmount = render(
      <>
        <Field>
          <OwnInput />
        </Field>
        <Field>
          <OwnInput />
        </Field>
      </>,
    );
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toMatch(/has no label/);
    unmount();
  });
});
