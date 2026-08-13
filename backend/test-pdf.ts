import * as fs from "fs";
import * as path from "path";
const { PDFParse } = require("pdf-parse");

async function main() {
  try {
    const pdfPath = path.join(__dirname, "../sample_test.pdf");
    console.log("Loading PDF from:", pdfPath);
    const pdfBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse(new Uint8Array(pdfBuffer));
    const parsedPdf = await parser.getText();
    console.log("Type of text:", typeof parsedPdf.text);
    console.log("Text length:", parsedPdf.text?.length);
    console.log("Text snippet:");
    console.log(parsedPdf.text?.substring(0, 1000));
  } catch (error) {
    console.error("Error with PDFParse:", error);
  }
}

main();
