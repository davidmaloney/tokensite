import express from "express";
import { renderPage } from "../templates/renderer.js";

const router = express.Router();

// ============================================================================
// STATELESS PREVIEW ENDPOINT
// ----------------------------------------------------------------------------
// Takes the in-progress page content the user is building (in their browser,
// NOT yet saved or paid for) and returns the fully-rendered HTML — the exact
// same output the live page would produce, including the real template canvas
// animation.
//
// IMPORTANT: this endpoint is completely isolated and read-only:
//   - It writes NOTHING to the database.
//   - It creates NO page row and reserves NO slug.
//   - It never touches the create -> pay -> activate flow.
//   - It simply builds a throwaway in-memory "page" object and hands it to the
//     existing renderPage() function, then returns the HTML string.
// The generated HTML is shown in an iframe in the create-flow preview and then
// discarded. Nothing about the real page system is affected.
// ============================================================================
router.post("/", (req, res) => {
  try {
    const { templateId, content } = req.body || {};

    // Build a throwaway in-memory page object in the exact shape renderPage
    // expects (template_id, content_json string, slug). Nothing is persisted.
    const fakePage = {
      slug: "preview",
      template_id: templateId || "template_1",
      content_json: JSON.stringify(content || {}),
    };

    const html = renderPage(fakePage);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (err) {
    // On any failure, return a minimal empty page so the preview simply shows
    // nothing rather than erroring — never throws back into the app.
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send("<!DOCTYPE html><html><body style=\"margin:0;background:#0d0d0d\"></body></html>");
  }
});

export default router;
