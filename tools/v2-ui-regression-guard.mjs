#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

const files = {
  questionComponents: resolve(repoRoot, "拾贝/拾贝/V2/Components/Flow/V2QuestionComponents.swift"),
  reviewFlowScreens: resolve(repoRoot, "拾贝/拾贝/V2/Screens/Review/V2ReviewFlowScreens.swift")
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, path]) => [key, readFileSync(path, "utf8")])
);

const checks = [
  check(
    "matching_card_uses_external_width",
    /\.frame\(width: width\)/.test(source.questionComponents),
    "V2MatchingOptionCard must use its width parameter, not a private fixed width."
  ),
  check(
    "matching_card_uses_external_min_height",
    /\.frame\(minHeight: height\)/.test(source.questionComponents),
    "V2MatchingOptionCard must use its height parameter as the minimum card height."
  ),
  check(
    "matching_card_uses_external_horizontal_padding",
    /\.padding\(\.horizontal,\s*horizontalPadding\)/.test(source.questionComponents),
    "V2MatchingOptionCard must use its horizontalPadding parameter."
  ),
  check(
    "matching_card_has_no_private_fixed_width_metrics",
    !/static let (width|minHeight|textWidth): CGFloat =/.test(extractMatchingCardPrivateMetrics(source.questionComponents)),
    "V2MatchingOptionCard must not hide fixed width/minHeight/textWidth inside its private Metrics."
  ),
  check(
    "matching_screen_passes_card_metrics",
    /width:\s*V2MatchingPageMetrics\.optionCardWidth/.test(source.reviewFlowScreens)
      && /height:\s*cardHeight/.test(source.reviewFlowScreens)
      && /horizontalPadding:\s*V2MatchingPageMetrics\.optionCardHorizontalPadding/.test(source.reviewFlowScreens),
    "V2MatchingQuestionView must pass screen metrics into V2MatchingOptionCard."
  ),
  check(
    "matching_screen_has_dynamic_uniform_height",
    /static func optionCardHeight\(for pairs: \[V2MatchingPairData\]\)/.test(source.reviewFlowScreens),
    "Matching option cards should use one dynamic height per question to preserve the two-column grid."
  )
];

console.log("# V2 UI Regression Guard");
for (const item of checks) {
  console.log(`${item.ok ? "PASS" : "FAIL"} ${item.name} - ${item.detail}`);
}

const failed = checks.filter((item) => !item.ok);
if (failed.length > 0) {
  console.error("");
  console.error(`V2 UI regression guard failed: ${failed.map((item) => item.name).join(", ")}`);
  process.exit(1);
}

function check(name, ok, detail) {
  return { name, ok: Boolean(ok), detail };
}

function extractMatchingCardSource(fileSource) {
  const start = fileSource.indexOf("struct V2MatchingOptionCard");
  const end = fileSource.indexOf("struct V2AnswerFeedbackPanel");
  if (start < 0 || end < 0 || end <= start) return fileSource;
  return fileSource.slice(start, end);
}

function extractMatchingCardPrivateMetrics(fileSource) {
  const matchingCard = extractMatchingCardSource(fileSource);
  return /private enum Metrics \{([\s\S]*?)\n    \}/.exec(matchingCard)?.[1] || "";
}
