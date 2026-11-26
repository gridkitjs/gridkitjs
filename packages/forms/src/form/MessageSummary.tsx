import { summarizeMessages, type Severity } from "@gridkitjs/forms-core";
import { focusTargetIn } from "@gridkitjs/forms-dom";
import {
  useCallback,
  useId,
  useMemo,
  useSyncExternalStore,
  type MouseEvent,
  type ReactNode,
  type RefCallback,
} from "react";
import { SeverityIcon } from "../field/FieldMessages";
import { classNames } from "../field/parts";
import { useFormSettings } from "../settings";
import { useFormContext, type FormContextValue } from "./formContext";

export interface MessageSummaryProps {
  /** In place of "There are 2 problems with this form". */
  readonly title?: ReactNode;
  /** The heading element the title is. */
  readonly headingLevel?: 2 | 3 | 4 | 5 | 6 | undefined;
  /** Which messages it lists. */
  readonly severities?: readonly Severity[] | undefined;
  readonly className?: string | undefined;
}

const DEFAULT_SEVERITIES: readonly Severity[] = ["error", "warning"];

function subscribeToNothing() {
  return () => undefined;
}

const NO_FIELDS: readonly never[] = [];

/**
 * Every message the fields of its `Form` show, of the chosen severities,
 * field by field in document order, each a link that focuses its field
 * (opening a collapsed section around it), under a title with the count
 * and a count per severity. It renders nothing while there is nothing to
 * list. A refused submit moves focus to it, so the count is read first.
 */
export function MessageSummary({
  title,
  headingLevel = 2,
  severities = DEFAULT_SEVERITIES,
  className,
}: MessageSummaryProps) {
  const form = useFormContext();
  const { messages } = useFormSettings();
  const titleId = useId();
  const fields = useSyncExternalStore(
    form?.registry.subscribe ?? subscribeToNothing,
    () => form?.registry.getFields() ?? NO_FIELDS,
    () => NO_FIELDS,
  );
  const { items, counts } = useMemo(
    () => summarizeMessages(fields, severities),
    [fields, severities],
  );
  const summaryRef = useCallback<RefCallback<HTMLDivElement>>(
    (element) => (element === null ? undefined : form?.setSummary(element)),
    [form],
  );

  if (form === null || items.length === 0) {
    return null;
  }
  const Heading = `h${String(headingLevel)}` as
    "h2" | "h3" | "h4" | "h5" | "h6";

  return (
    <div
      ref={summaryRef}
      role="region"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={classNames(
        "gridkit-forms-message-summary",
        `is-${counts[0]?.severity ?? "error"}`,
        className,
      )}
    >
      <Heading className="gridkit-forms-message-summary-title" id={titleId}>
        {title ?? messages.messageSummaryTitle(items.length)}
      </Heading>
      <p className="gridkit-forms-message-summary-counts">
        {counts.map(({ severity, count }, index) => (
          <span key={severity}>
            {index > 0 && ", "}
            <span
              className={`gridkit-forms-message-summary-count is-${severity}`}
            >
              {messages.severityCount(severity, count)}
            </span>
          </span>
        ))}
      </p>
      <ul className="gridkit-forms-message-summary-list">
        {items.map(({ field, message }, index) => (
          <li
            // A field may show two messages with one text.
            key={`${field.id}:${String(index)}`}
            className={`gridkit-forms-message-summary-item is-${message.severity}`}
          >
            <span className="gridkit-forms-message-icon" aria-hidden="true">
              <SeverityIcon severity={message.severity} />
            </span>
            <a
              className="gridkit-forms-message-summary-link"
              href={`#${field.id}`}
              onClick={(event) => {
                focusField(event, form, field.id);
              }}
            >
              {field.label === null ? (
                message.text
              ) : (
                <>
                  {field.label}: {message.text}
                </>
              )}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Focuses the field a summary link points at, rather than only scrolling
 * to it, when it is in the page.
 */
function focusField(
  event: MouseEvent<HTMLAnchorElement>,
  form: FormContextValue,
  id: string,
): void {
  const target = event.currentTarget.ownerDocument.getElementById(id);
  const control = target === null ? null : focusTargetIn(target);
  if (control !== null) {
    event.preventDefault();
    form.focusControl(control);
  }
}
