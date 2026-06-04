import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell.js";
import { ServicesPage } from "./pages/ServicesPage.js";
import { IncidentsPage } from "./pages/IncidentsPage.js";
import { AlertsPage } from "./pages/AlertsPage.js";
import { IncidentDetailsPage } from "./pages/IncidentDetailsPage.js";
import { AskPage } from "./pages/AskPage.js";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<ServicesPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/incidents/:id" element={<IncidentDetailsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/ask" element={<AskPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
