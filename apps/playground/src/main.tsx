import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Walkthrough, walkthroughDemoFromUrl } from "./Walkthrough.tsx";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing #root element, check index.html.");
}

const walkthroughDemo = walkthroughDemoFromUrl();

createRoot(rootElement).render(
  <StrictMode>
    {walkthroughDemo === undefined ? (
      <App />
    ) : (
      <Walkthrough demo={walkthroughDemo} />
    )}
  </StrictMode>,
);
