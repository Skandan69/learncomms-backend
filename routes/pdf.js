const express = require("express");
const puppeteer = require("puppeteer");

const router = express.Router();

router.post("/generate-pdf", async (req, res) => {
  let browser;

  try {
    const { html } = req.body;

    if (!html) {
      return res.status(400).json({ error: "HTML required" });
    }

    console.log("📄 PDF request received");
    console.log("HTML length:", html.length);

    // 🚀 Launch Puppeteer (Render-safe config)
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    });

    console.log("✅ Browser launched");

    const page = await browser.newPage();

    // ✅ Load HTML safely
    await page.setContent(html, {
      waitUntil: "domcontentloaded"
    });

    // ✅ Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "10mm",
        bottom: "10mm",
        left: "10mm",
        right: "10mm"
      }
    });

    console.log("✅ PDF generated");

    // ✅ Close browser
    await browser.close();

    // ✅ Send file
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=resume.pdf"
    });

    res.send(pdf);

  } catch (err) {
    console.error("❌ PDF ERROR:", err);

    if (browser) {
      await browser.close();
    }

    res.status(500).json({ error: "PDF generation failed" });
  }
});

module.exports = router;
