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

    // 🚀 Launch Puppeteer (FINAL FIX)
    browser = await puppeteer.launch({
      headless: "new",
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        puppeteer.executablePath(), // 🔥 fallback
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox"
      ]
    });

    console.log("✅ Browser launched");

    const page = await browser.newPage();

    // ✅ Load HTML safely
    await page.setContent(html, {
      waitUntil: "domcontentloaded"
    });

    // ⏳ Small delay to ensure CSS loads
    await new Promise(resolve => setTimeout(resolve, 1000));

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

    await browser.close();

    // ✅ Send PDF
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=resume.pdf"
    });

    res.send(pdf);

  } catch (err) {
    console.error("❌ PDF ERROR FULL:", err);
    console.error("❌ STACK:", err.stack);

    if (browser) {
      await browser.close();
    }

    res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  }
});

module.exports = router;
