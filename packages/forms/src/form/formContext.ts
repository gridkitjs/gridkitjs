import {
  createFieldRegistry,
  type FieldMessage,
  type FieldRegistry,
  type RegisteredField,
} from "@gridkitjs/forms-core";
import { compareDocumentOrder } from "@gridkitjs/forms-dom";
import {
  createContext,
  useContext,
  useLayoutEffect,
  type ReactNode,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";

/** A field as a `MessageSummary` lists it. */
export interface SummaryField extends RegisteredField {
  /** What the summary names the field by; `null` lists its messages alone. */
  readonly label: ReactNode;
  /** The field's root, which places it in document order. */
  readonly element: HTMLElement;
}

/** A collapsible `FormSection`, which opens before focus moves inside it. */
export interface CollapsibleSection {
  readonly element: HTMLElement;
  readonly expand: () => void;
}

/** What a `Form` shares with the fields, sections and summary inside it. */
export interface FormContextValue {
  readonly registry: FieldRegistry<SummaryField>;
  /** Adds a collapsible section, and returns what removes it. */
  readonly addSection: (section: CollapsibleSection) => () => void;
  /**
   * Sets the form's `MessageSummary` element while it shows, which a
   * refused submit focuses, and returns what unsets it.
   */
  readonly setSummary: (element: HTMLElement) => () => void;
  readonly getSummary: () => HTMLElement | null;
  /** Opens every collapsed section around `control`, then focuses it. */
  readonly focusControl: (control: HTMLElement) => void;
}

/** The context of one `Form`, made once when it mounts. */
export function createFormContext(): FormContextValue {
  const sections = new Set<CollapsibleSection>();
  let summary: HTMLElement | null = null;
  return {
    registry: createFieldRegistry<SummaryField>((a, b) =>
      compareDocumentOrder(a.element, b.element),
    ),
    addSection(section) {
      sections.add(section);
      return () => {
        sections.delete(section);
      };
    },
    setSummary(element) {
      summary = element;
      return () => {
        if (summary === element) {
          summary = null;
        }
      };
    },
    getSummary: () => summary,
    focusControl(control) {
      // A control in a collapsed section is hidden and takes no focus
      // until the section has opened, so the opening renders first.
      flushSync(() => {
        for (const section of sections) {
          if (section.element.contains(control)) {
            section.expand();
          }
        }
      });
      control.focus();
    },
  };
}

export const FormContext = createContext<FormContextValue | null>(null);

/** The `Form` around the caller, or `null` outside one. */
export function useFormContext(): FormContextValue | null {
  return useContext(FormContext);
}

/**
 * Lists a field's shown `messages` in its form's summary, under `id` (the
 * element a summary link points at) and `label`, while it has any.
 */
export function useSummaryEntry(
  id: string,
  label: ReactNode,
  messages: readonly FieldMessage[],
  root: RefObject<HTMLElement | null>,
): void {
  const form = useFormContext();
  useLayoutEffect(() => {
    const element = root.current;
    if (form === null || element === null || messages.length === 0) {
      return undefined;
    }
    return form.registry.register({ id, label, messages, element });
  }, [form, id, label, messages, root]);
}
