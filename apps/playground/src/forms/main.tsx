import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { FormsPlayground } from "./FormsPlayground";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Missing #root element, check forms.html.");
}

createRoot(rootElement).render(
  <StrictMode>
    <FormsPlayground />
  </StrictMode>,
);
