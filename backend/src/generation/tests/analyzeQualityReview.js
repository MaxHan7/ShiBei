import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyzeManualReview, renderManualReport } from "./qualityReport.js";

async function main() {
  const [resultFile, reviewFile] = process.argv.slice(2);
  if (!resultFile || !reviewFile) {
    throw new Error("用法：node backend/src/generation/tests/analyzeQualityReview.js <machine-result.json> <manual-review.csv>");
  }

  const machineReport = JSON.parse(await readFile(resultFile, "utf8"));
  const csvText = await readFile(reviewFile, "utf8");
  const manualSummary = analyzeManualReview({ machineReport, csvText });
  const markdown = renderManualReport({
    machineReport,
    manualSummary,
    resultFile,
    reviewFile
  });
  const outputBase = resultFile.replace(/\.json$/i, "");
  const markdownFile = `${outputBase}.manual-analysis.md`;
  const jsonFile = `${outputBase}.manual-summary.json`;
  await writeFile(markdownFile, markdown, "utf8");
  await writeFile(jsonFile, JSON.stringify({ manualSummary }, null, 2), "utf8");
  console.log(JSON.stringify({
    markdownFile: path.resolve(markdownFile),
    jsonFile: path.resolve(jsonFile),
    manualSummary
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
