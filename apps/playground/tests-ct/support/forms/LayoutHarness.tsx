import {
  Field,
  FormLayout,
  type FieldSpan,
  type LabelPosition,
} from "@gridkitjs/forms";
import { FieldTextInput } from "./FieldTextInput";

export interface LayoutHarnessProps {
  /** The layout's own width, as a CSS length. */
  readonly width: string;
  readonly columns?: 1 | 2 | 3 | 4;
  /** The span of the first field, "Name". */
  readonly span?: FieldSpan;
  readonly labelPosition?: LabelPosition;
  readonly dir?: "ltr" | "rtl";
}

/**
 * A `FormLayout` of a given width holding four fields, "Name" (with
 * `span`), "Email", "Phone" and "City".
 */
export default function LayoutHarness({
  width,
  columns,
  span,
  labelPosition,
  dir = "ltr",
}: LayoutHarnessProps) {
  return (
    <div dir={dir} style={{ inlineSize: width }}>
      <FormLayout columns={columns} labelPosition={labelPosition}>
        <Field label="Name" span={span}>
          <FieldTextInput />
        </Field>
        <Field label="Email">
          <FieldTextInput />
        </Field>
        <Field label="Phone">
          <FieldTextInput />
        </Field>
        <Field label="City">
          <FieldTextInput />
        </Field>
      </FormLayout>
    </div>
  );
}
