const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const mdPath = "D:\\unistrix\\NERMAI_IAS_ACADEMY\\work flow doc\\workflow_documentation.md";
const pdfDir = "D:\\unistrix\\NERMAI_IAS_ACADEMY\\work flow doc";
const pdfPath = path.join(pdfDir, "workflow_documentation.pdf");

// Read markdown
const mdContent = fs.readFileSync(mdPath, "utf8");

// Parse markdown into simplified headings and paragraphs
const lines = mdContent.split("\n");

// Create document
const doc = new PDFDocument({
  size: "A4",
  margins: { top: 40, bottom: 40, left: 50, right: 50 }
});

const writeStream = fs.createWriteStream(pdfPath);
doc.pipe(writeStream);

// Cover Page / Header
doc.fillColor("#7b0000").fontSize(22).font("Helvetica-Bold").text("NERMAI IAS ACADEMY", { align: "center" });
doc.fontSize(14).fillColor("#FFD700").text("Complete Application Workflow Documentation", { align: "center" });
doc.moveDown(1.5);

doc.strokeColor("#ddd").lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
doc.moveDown(1.5);

for (let line of lines) {
  line = line.trim();
  if (!line) {
    doc.moveDown(0.5);
    continue;
  }

  // Headings
  if (line.startsWith("# ")) {
    doc.fillColor("#7b0000").fontSize(18).font("Helvetica-Bold").text(line.replace("# ", ""));
    doc.moveDown(0.6);
  } else if (line.startsWith("## ")) {
    doc.fillColor("#1565c0").fontSize(14).font("Helvetica-Bold").text(line.replace("## ", ""));
    doc.moveDown(0.5);
  } else if (line.startsWith("### ")) {
    doc.fillColor("#2e7d32").fontSize(12).font("Helvetica-Bold").text(line.replace("### ", ""));
    doc.moveDown(0.4);
  }
  // List Items
  else if (line.startsWith("- ") || line.startsWith("* ")) {
    const text = line.substring(2).replace(/\*\*/g, "");
    doc.fillColor("#333333").fontSize(10).font("Helvetica");
    
    // Bullet point layout
    doc.text("• ", { continued: true });
    doc.text(text);
    doc.moveDown(0.3);
  }
  // Tables simple parse
  else if (line.startsWith("|")) {
    if (line.includes("---") || line.includes("Role | Target")) continue; // Skip header divider
    const cols = line.split("|").map(c => c.trim()).filter(Boolean);
    if (cols.length >= 2) {
      doc.fillColor("#555555").fontSize(9).font("Helvetica-Bold").text(`${cols[0]}: `, { continued: true });
      doc.font("Helvetica").fillColor("#333333").text(cols.slice(1).join(" | "));
      doc.moveDown(0.35);
    }
  }
  // Standard Paragraph
  else {
    const text = line.replace(/\*\*/g, "");
    doc.fillColor("#333333").fontSize(10).font("Helvetica").text(text, { align: "justify", lineGap: 2 });
    doc.moveDown(0.4);
  }

  // Handle page limits nicely
  if (doc.y > 750) {
    doc.addPage();
  }
}

doc.end();

writeStream.on("finish", () => {
  console.log("PDF Created Successfully at:", pdfPath);
});
