import type {
  FieldMessage,
  FormsMessages,
  Severity,
} from "@gridkitjs/forms-core";
import type { ReactNode } from "react";

function Icon({ children }: { readonly children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/**
 * A different shape for each severity, so it never rests on colour alone:
 * a cross, an exclamation mark in a triangle, an "i" and a tick.
 */
function SeverityIcon({ severity }: { readonly severity: Severity }) {
  switch (severity) {
    case "error":
      return (
        <Icon>
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6" />
          <path d="m9 9 6 6" />
        </Icon>
      );
    case "warning":
      return (
        <Icon>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </Icon>
      );
    case "info":
      return (
        <Icon>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </Icon>
      );
    case "success":
      return (
        <Icon>
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </Icon>
      );
  }
}

/**
 * A field's message area: always in the page, empty when there is nothing
 * to say, and a polite live region, so a message that appears as the user
 * leaves the field is read without moving focus. Each message is read
 * after its severity's name, which is visually hidden; the icon says it to
 * the eye.
 */
export function FieldMessages({
  id,
  messages,
  strings,
}: {
  readonly id: string;
  readonly messages: readonly FieldMessage[];
  readonly strings: FormsMessages;
}) {
  return (
    <div className="gridkit-forms-field-messages" id={id} aria-live="polite">
      {messages.map((message, index) => (
        <p
          // Messages carry no id, and two may share a text.
          key={`${String(index)}:${message.text}`}
          className={`gridkit-forms-message is-${message.severity}`}
        >
          <span className="gridkit-forms-message-icon" aria-hidden="true">
            <SeverityIcon severity={message.severity} />
          </span>
          <span className="gridkit-forms-sr-only">
            {`${strings.severityLabel(message.severity)}: `}
          </span>
          <span className="gridkit-forms-message-text">{message.text}</span>
        </p>
      ))}
    </div>
  );
}
