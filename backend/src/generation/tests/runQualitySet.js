import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateReviewChapter } from "../index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../..");
const samplesDir = path.join(repoRoot, "quality-test-set", "samples");
const resultsDir = path.join(repoRoot, "quality-test-set", "results");

async function main() {
  const sampleFilter = process.env.QUALITY_SAMPLE?.trim().toLowerCase();
  const sampleFiles = (await readdir(samplesDir))
    .filter((file) => file.endsWith(".md") || file.endsWith(".txt"))
    .filter((file) => file.toLowerCase() !== "readme.md")
    .filter((file) => !sampleFilter || file.toLowerCase().includes(sampleFilter))
    .sort();

  if (!sampleFiles.length) {
    throw new Error(sampleFilter
      ? `没有找到匹配 QUALITY_SAMPLE=${process.env.QUALITY_SAMPLE} 的测试样本。`
      : "没有找到可运行的测试样本。");
  }

  const results = [];
  for (const file of sampleFiles) {
    const rawText = await readFile(path.join(samplesDir, file), "utf8");
    const startedAt = new Date().toISOString();
    try {
      const output = await generateReviewChapter({ sourceType: "text", rawText });
      results.push({
        file,
        startedAt,
        status: output.status,
        chapter: output.chapter || null,
        generationDebug: output.generationDebug || null,
        message: output.message || ""
      });
    } catch (error) {
      results.push({
        file,
        startedAt,
        status: "error",
        chapter: null,
        message: error.message
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    summary: summarize(results),
    reviewRows: buildReviewRows(results),
    results
  };

  await mkdir(resultsDir, { recursive: true });
  const outputFile = path.join(resultsDir, `${timestamp()}.json`);
  await writeFile(outputFile, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ outputFile, summary: report.summary }, null, 2));
}

function summarize(results) {
  const completed = results.filter((result) => result.status === "completed");
  const chapters = results.filter((result) => result.chapter);
  const allQuestions = chapters.flatMap((result) => result.chapter?.questions || []);
  const qualityScores = allQuestions
    .map((question) => question.qualityScore?.average)
    .filter((score) => Number.isFinite(score));
  const seriousIssueCount = completed.reduce(
    (sum, result) => sum + (result.chapter?.qualitySummary?.seriousIssueCount || 0),
    0
  );

  return {
    sampleCount: results.length,
    successCount: completed.length,
    failureCount: results.length - completed.length,
    knowledgePointCount: chapters.reduce((sum, result) => sum + (result.chapter?.knowledgePoints?.length || 0), 0),
    qualifiedQuestionCount: allQuestions.length,
    coveredKnowledgePointCount: chapters.reduce((sum, result) => {
      const diagnostics = result.generationDebug?.pointDiagnostics || [];
      return sum + diagnostics.filter((point) => point.status === "covered").length;
    }, 0),
    uncoveredKnowledgePointCount: chapters.reduce((sum, result) => {
      const diagnostics = result.generationDebug?.pointDiagnostics || [];
      return sum + diagnostics.filter((point) => point.status !== "covered").length;
    }, 0),
    questionCoverageRate: calculateCoverageRate(chapters),
    averageQualityScore: qualityScores.length
      ? Math.round((qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length) * 10) / 10
      : 0,
    seriousIssueCount
  };
}

function calculateCoverageRate(completed) {
  const diagnostics = completed.flatMap((result) => result.generationDebug?.pointDiagnostics || []);
  if (!diagnostics.length) return 0;
  const covered = diagnostics.filter((point) => point.status === "covered").length;
  return Math.round((covered / diagnostics.length) * 1000) / 10;
}

function buildReviewRows(results) {
  return results.flatMap((result) => {
    const chapter = result.chapter;
    const acceptedRows = (chapter?.questions || []).map((question) => questionToReviewRow({
      result,
      question,
      status: result.status
    }));
    const rejectedQuestions = (result.generationDebug?.evaluatedQuestions || [])
      .filter((question) => question.qualityAction !== "pass");
    const rejectedRows = rejectedQuestions.map((question) => questionToReviewRow({
      result,
      question,
      status: `${result.status}:rejected`
    }));

    if (!acceptedRows.length && !rejectedRows.length) {
      return [{
        sample: result.file,
        status: result.status,
        questionId: "",
        knowledgePoint: "",
        questionType: "",
        stem: "",
        sourceSnippet: "",
        machineAverageScore: "",
        machineIssues: result.message || "no_questions",
        humanSourceSupport: "",
        humanAnswerUniqueness: "",
        humanUnderstandingDepth: "",
        humanClarity: "",
        humanDistractorQuality: "",
        humanReviewValue: "",
        humanUsable: "",
        humanSeriousIssue: "",
        humanNotes: ""
      }];
    }

    return [...acceptedRows, ...rejectedRows];
  });
}

function questionToReviewRow({ result, question, status }) {
  return {
    sample: result.file,
    status,
    questionId: question.id,
    knowledgePoint: question.pointTitle || question.knowledgePointId || "",
    questionType: question.type,
    stem: question.stem,
    sourceSnippet: question.sourceSnippet || question.source_snippet || "",
    machineAverageScore: question.qualityScore?.average ?? "",
    machineIssues: (question.qualityIssues || []).join(";"),
    humanSourceSupport: "",
    humanAnswerUniqueness: "",
    humanUnderstandingDepth: "",
    humanClarity: "",
    humanDistractorQuality: "",
    humanReviewValue: "",
    humanUsable: "",
    humanSeriousIssue: "",
    humanNotes: ""
  };
}

function timestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}-${hh}${mi}${ss}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
