import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { classNames } from "../field/parts";
import { useFormContext } from "../form/formContext";
import {
  FormSettingsProvider,
  useResolvedSettings,
  type Density,
  type FieldMode,
  type LabelPosition,
} from "../settings";

export interface FormSectionProps {
  readonly title: ReactNode;
  /** The heading element the title is. */
  readonly headingLevel?: 2 | 3 | 4 | 5 | 6 | undefined;
  /** Under the title. */
  readonly description?: ReactNode;
  /** The title becomes a button that shows and hides the section's body. */
  readonly collapsible?: boolean | undefined;
  /** Whether a collapsible section is open; present means controlled. */
  readonly expanded?: boolean | undefined;
  /** Whether an uncontrolled collapsible section starts open. */
  readonly defaultExpanded?: boolean | undefined;
  readonly onExpandedChange?: ((expanded: boolean) => void) | undefined;
  readonly mode?: FieldMode | undefined;
  readonly density?: Density | undefined;
  readonly labelPosition?: LabelPosition | undefined;
  readonly readOnly?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  /** The section's `id`; the title's and the body's are made from it. */
  readonly id?: string | undefined;
  readonly className?: string | undefined;
  readonly children?: ReactNode;
}

function Chevron() {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * A titled part of a long form, with settings for the fields in it. A
 * collapsible one follows the disclosure pattern: its title is a button
 * that shows and hides the body, which stays mounted while hidden, so its
 * fields keep their values. Focus moving to a field inside a collapsed
 * section of a `Form` (a summary link, a refused submit) opens it first.
 */
export function FormSection({
  title,
  headingLevel = 2,
  description,
  collapsible = false,
  expanded,
  defaultExpanded = true,
  onExpandedChange,
  mode,
  density,
  labelPosition,
  readOnly,
  disabled,
  id,
  className,
  children,
}: FormSectionProps) {
  const settings = useResolvedSettings({
    mode,
    density,
    labelPosition,
    readOnly,
    disabled,
  });
  const generatedId = useId();
  const sectionId = id ?? generatedId;
  const titleId = `${sectionId}-title`;
  const bodyId = `${sectionId}-body`;
  const descriptionId = `${sectionId}-description`;
  const hasDescription = description !== undefined && description !== null;

  const [ownExpanded, setOwnExpanded] = useState(defaultExpanded);
  const open = !collapsible || (expanded ?? ownExpanded);
  const setOpen = useCallback(
    (next: boolean) => {
      if (expanded === undefined) {
        setOwnExpanded(next);
      }
      onExpandedChange?.(next);
    },
    [expanded, onExpandedChange],
  );

  const root = useRef<HTMLElement>(null);
  const form = useFormContext();
  useLayoutEffect(() => {
    const element = root.current;
    if (form === null || element === null || !collapsible) {
      return undefined;
    }
    return form.addSection({
      element,
      expand: () => {
        if (!open) {
          setOpen(true);
        }
      },
    });
  }, [form, collapsible, open, setOpen]);

  const Heading = `h${String(headingLevel)}` as
    "h2" | "h3" | "h4" | "h5" | "h6";

  return (
    <section
      ref={root}
      id={sectionId}
      aria-labelledby={titleId}
      aria-describedby={hasDescription ? descriptionId : undefined}
      className={classNames(
        "gridkit-forms-section",
        collapsible && "is-collapsible",
        !open && "is-collapsed",
        className,
      )}
    >
      <div className="gridkit-forms-section-header">
        <Heading className="gridkit-forms-section-title" id={titleId}>
          {collapsible ? (
            <button
              type="button"
              className="gridkit-forms-section-toggle"
              aria-expanded={open}
              aria-controls={bodyId}
              onClick={() => {
                setOpen(!open);
              }}
            >
              <span
                className="gridkit-forms-section-toggle-icon"
                aria-hidden="true"
              >
                <Chevron />
              </span>
              {title}
            </button>
          ) : (
            title
          )}
        </Heading>
        {hasDescription && (
          <p className="gridkit-forms-section-description" id={descriptionId}>
            {description}
          </p>
        )}
      </div>
      <div className="gridkit-forms-section-body" id={bodyId} hidden={!open}>
        <FormSettingsProvider settings={settings}>
          {children}
        </FormSettingsProvider>
      </div>
    </section>
  );
}
