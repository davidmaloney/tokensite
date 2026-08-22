import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import CreatePage from "./pages/CreatePage";
import ManagePage from "./pages/ManagePage";
import LaunchToken from "./pages/LaunchToken";
import AdminClaim from "./components/AdminClaim";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div style={{ paddingTop: "64px", minHeight: "100vh" }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create" element={<CreatePage />} />
          <Route path="/manage/:pageId" element={<ManagePage />} />
          <Route path="/launch" element={<LaunchToken />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
      <AdminClaim />
    </BrowserRouter>
  );
}
