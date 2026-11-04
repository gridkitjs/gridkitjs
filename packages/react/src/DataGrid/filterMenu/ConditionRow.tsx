import type { ChangeEvent, Ref, RefCallback } from "react";
import {
  filterOperandArity,
  parseFilterOperand,
  type ColumnType,
  type ConditionRowDraft,
  type FilterOperatorFamily,
  type GridMessages,
  type ResolvedColumnFilterMenu,
} from "@gridkitjs/core";

/**
 * The input a column of `type` takes an operand in, each writing what
 * `@gridkitjs/core`'s `parseFilterOperand` reads: a day for a date column, a
 * day and a time for a date-time or time one.
 */
function inputType(
  family: Exclude<FilterOperatorFamily, "boolean">,
  type: ColumnType | undefined,
): "text" | "number" | "date" | "datetime-local" {
  switch (family) {
    case "text":
      return "text";
    case "number":
      return "number";
    case "date":
      return type === "date" ? "date" : "datetime-local";
  }
}

interface OperandFieldProps {
  readonly family: FilterOperatorFamily;
  readonly type: ColumnType | undefined;
  readonly text: string;
  /** Its accessible name: "Value", or a `between`'s "From" or "To". */
  readonly label: string;
  /** The id of the message describing it while it is invalid. */
  readonly invalidMessageId: string | undefined;
  readonly fieldRef: RefCallback<HTMLElement> | undefined;
  readonly messages: GridMessages;
  readonly onChange: (text: string) => void;
}

/** One operand's box — a true/false choice on a boolean column. */
function OperandField({
  family,
  type,
  text,
  label,
  invalidMessageId,
  fieldRef,
  messages,
  onChange,
}: OperandFieldProps) {
  const field = {
    ref: fieldRef,
    className: "filter-menu-value",
    "aria-label": label,
    "aria-invalid": invalidMessageId === undefined ? undefined : true,
    "aria-describedby": invalidMessageId,
    value: text,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onChange(event.currentTarget.value);
    },
  };
  if (family === "boolean") {
    // Empty to start with, as a text box is, so a second condition left
    // alone is dropped rather than applied as "Equals true".
    return (
      <select {...field}>
        <option value="" />
        <option value="true">{messages.booleanTrue}</option>
        <option value="false">{messages.booleanFalse}</option>
      </select>
    );
  }
  return <input {...field} type={inputType(family, type)} />;
}

interface ConditionRowProps {
  readonly row: ConditionRowDraft;
  /** Its place among the editor's conditions, from one — what names it. */
  readonly position: number;
  readonly menu: ResolvedColumnFilterMenu;
  readonly type: ColumnType | undefined;
  readonly messages: GridMessages;
  /**
   * The id of the message saying its value is missing or doesn't read, while
   * it is marked so: each box whose text doesn't read is then invalid, and
   * described by it.
   */
  readonly invalidMessageId: string | undefined;
  /**
   * The `ref` of the control focus starts on: its first box, or its operator
   * picker when its operator takes no operand.
   */
  readonly focusRef: RefCallback<HTMLElement> | undefined;
  readonly onChange: (row: ConditionRowDraft) => void;
  readonly ref: Ref<HTMLDivElement>;
}

/**
 * One condition of a filter menu's editor, as typed: an operator picker,
 * then a box for each operand its operator takes — none for the blanks
 * operators, two for `between`'s ends.
 */
export default function ConditionRow({
  row,
  position,
  menu,
  type,
  messages,
  invalidMessageId,
  focusRef,
  onChange,
  ref,
}: ConditionRowProps) {
  const arity = filterOperandArity(row.operator);
  // A condition set in code can use an operator the column doesn't offer; it
  // is listed too, so the row shows the condition as it is.
  const operators = menu.operators.includes(row.operator)
    ? menu.operators
    : [row.operator, ...menu.operators];
  const operand = { family: menu.family, type, messages };

  /**
   * The message id for a box holding `text`, while the row is marked: on the
   * box that is empty or doesn't read — a `between`'s missing end, not the
   * one filled in.
   */
  function messageIdFor(text: string): string | undefined {
    return parseFilterOperand(text, type) === undefined
      ? invalidMessageId
      : undefined;
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-label={messages.filterConditionLabel(position)}
      className="filter-menu-condition"
    >
      <select
        ref={arity === 0 ? focusRef : undefined}
        className="filter-menu-operator"
        aria-label={messages.filterOperatorFieldLabel}
        value={row.operator}
        onChange={(event) => {
          const operator = operators[event.currentTarget.selectedIndex];
          if (operator !== undefined) {
            onChange({ ...row, operator });
          }
        }}
      >
        {operators.map((operator) => (
          <option key={operator} value={operator}>
            {messages.filterOperatorLabel(operator, menu.family)}
          </option>
        ))}
      </select>
      {arity > 0 && (
        <OperandField
          {...operand}
          text={row.text}
          label={
            arity === 2 ? messages.filterFromLabel : messages.filterValueLabel
          }
          invalidMessageId={messageIdFor(row.text)}
          fieldRef={focusRef}
          onChange={(text) => {
            onChange({ ...row, text });
          }}
        />
      )}
      {arity === 2 && (
        <OperandField
          {...operand}
          text={row.textTo}
          label={messages.filterToLabel}
          invalidMessageId={messageIdFor(row.textTo)}
          fieldRef={undefined}
          onChange={(textTo) => {
            onChange({ ...row, textTo });
          }}
        />
      )}
    </div>
  );
}
