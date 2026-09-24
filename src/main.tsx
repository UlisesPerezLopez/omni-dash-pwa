import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter";
import "@fontsource/roboto";
import "@fontsource/merriweather";
import "@fontsource/playfair-display";
import "@fontsource/jetbrains-mono";
import "flag-icons/css/flag-icons.min.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
