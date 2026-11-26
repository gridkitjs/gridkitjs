import { useId, type ReactNode } from "react";

/** One component's section on the page: a heading, a note, its states. */
export function DemoSection({
  title,
  description,
  children,
}: {
  readonly title: string;
  readonly description?: ReactNode;
  readonly children: ReactNode;
}) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-gridkit-line p-5"
    >
      <h2 id={headingId} className="text-base font-semibold">
        {title}
      </h2>
      {description !== undefined && (
        <p className="mt-1 text-sm text-gridkit-fg-muted">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}
