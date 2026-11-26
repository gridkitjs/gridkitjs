import { useCallback, useId, useState } from "react";
import { DemoSection } from "../DemoSection";
import { useEventReporter } from "../eventLog";
import { usePlaygroundSettings, type Density } from "../settings";

const NATIVE_EVENTS = ["focus", "input", "change", "blur"] as const;

const DENSITY_CLASS: Readonly<Record<Density, string>> = {
  compact: "h-6 px-1.5 text-sm",
  standard: "h-8 px-2 text-sm",
  comfortable: "h-10 px-3 text-base",
};

/**
 * A plain text input reporting the browser's own events to the log, and
 * drawn from the page controls, until the forms inputs exist.
 */
export function PlaceholderInputDemo() {
  const { settings } = usePlaygroundSettings();
  const reporter = useEventReporter("Placeholder input");
  const inputId = useId();
  const [text, setText] = useState("");

  // A ref callback, so the listeners live exactly as long as the input,
  // which display mode unmounts.
  const listen = useCallback(
    (input: HTMLInputElement) => {
      let previousText = input.value;
      const report = (event: Event) => {
        const current = input.value;
        reporter(event.type)(
          event.type === "input"
            ? {
                value: current,
                previousValue: previousText,
                text: current,
                nativeEvent: event,
              }
            : { value: current, text: current, nativeEvent: event },
        );
        previousText = current;
      };
      for (const type of NATIVE_EVENTS) {
        input.addEventListener(type, report);
      }
      return () => {
        for (const type of NATIVE_EVENTS) {
          input.removeEventListener(type, report);
        }
      };
    },
    [reporter],
  );

  return (
    <DemoSection
      title="Placeholder input"
      description="A native input, logging its focus, input, change and blur events."
    >
      <div className="flex max-w-sm flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium">
          Placeholder text
        </label>
        {settings.mode === "edit" ? (
          <input
            ref={listen}
            id={inputId}
            type="text"
            className={`${DENSITY_CLASS[settings.density]} rounded border border-gridkit-fg-muted bg-gridkit-surface text-gridkit-fg read-only:bg-gridkit-surface-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gridkit-accent disabled:opacity-50`}
            value={text}
            disabled={settings.disabled}
            readOnly={settings.readOnly}
            onChange={(event) => {
              setText(event.target.value);
            }}
          />
        ) : (
          <output id={inputId} className="text-sm">
            {text === "" ? "—" : text}
          </output>
        )}
      </div>
    </DemoSection>
  );
}
