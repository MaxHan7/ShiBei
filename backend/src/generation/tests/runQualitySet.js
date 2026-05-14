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
  const sampleFiles = (await readdir(samplesDir))
    .filter((file) => file.endsWith(".md") || file.endsWith(".txt"))
    .sort();

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
  const allQuestions = completed.flatMap((result) => result.chapter?.questions || []);
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
    knowledgePointCount: completed.reduce((sum, result) => sum + (result.chapter?.knowledgePoints?.length || 0), 0),
    qualifiedQuestionCount: allQuestions.length,
    averageQualityScore: qualityScores.length
      ? Math.round((qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length) * 10) / 10
      : 0,
    seriousIssueCount
  };
}

function buildReviewRows(results) {
  return results.flatMap((result) => {
    const chapter = result.chapter;
    if (!chapter?.questions?.length) {
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

    return chapter.questions.map((question) => ({
      sample: result.file,
      status: result.status,
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
    }));
  });
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
