import type { ReactNode } from "react";
import { FormsProvider } from "@gridkitjs/forms";
import { FieldDemo } from "./demos/FieldDemo";
import { FormStructureDemo } from "./demos/FormStructureDemo";
import { SearchInputDemo } from "./demos/SearchInputDemo";
import { TextInputDemo } from "./demos/TextInputDemo";
import { CheckboxDemo, SwitchDemo } from "./demos/ToggleDemo";
import { EventLogPanel } from "./EventLogPanel";
import { EventLogProvider } from "./eventLog";
import { PageControls } from "./PageControls";
import { PlaygroundSettingsProvider, usePlaygroundSettings } from "./settings";

/** Gives every forms component on the page its locale and density. */
function PageFormsProvider({ children }: { readonly children: ReactNode }) {
  const { settings } = usePlaygroundSettings();
  return (
    <FormsProvider locale={settings.locale} density={settings.density}>
      {children}
    </FormsProvider>
  );
}

/**
 * The forms playground: every forms component in its own section, drawn
 * from the page controls and reporting to the event log beside them.
 */
export function FormsPlayground() {
  return (
    <PlaygroundSettingsProvider>
      <PageFormsProvider>
        <EventLogProvider>
          <div className="flex min-h-dvh flex-col lg:h-dvh">
            <header className="border-b border-gridkit-line px-6 py-4">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h1 className="text-xl font-bold">GridKit Forms</h1>
                <p className="text-sm text-gridkit-fg-muted">
                  Every forms component in every state, without the grid.
                </p>
                <a
                  href="./"
                  className="ms-auto text-sm text-gridkit-accent underline underline-offset-2"
                >
                  Grid playground
                </a>
              </div>
              <div className="mt-4">
                <PageControls />
              </div>
            </header>
            <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
              <main className="flex flex-1 flex-col gap-6 p-6 lg:overflow-y-auto">
                <TextInputDemo />
                <SearchInputDemo />
                <CheckboxDemo />
                <SwitchDemo />
                <FieldDemo />
                <FormStructureDemo />
              </main>
              <aside className="flex h-96 flex-col border-t border-gridkit-line lg:h-auto lg:w-1/2 lg:border-t-0 xl:w-[46rem] lg:border-s">
                <EventLogPanel />
              </aside>
            </div>
          </div>
        </EventLogProvider>
      </PageFormsProvider>
    </PlaygroundSettingsProvider>
  );
}
