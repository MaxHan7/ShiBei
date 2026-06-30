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
const matchingCardSource = extractMatchingCardSource(source.questionComponents);
const matchingScreenSource = extractMatchingScreenSource(source.reviewFlowScreens);

const checks = [
  check(
    "matching_card_uses_external_width",
    /\.frame\(width: width(?:,|\))/.test(matchingCardSource),
    "V2MatchingOptionCard must use its width parameter, not a private fixed width."
  ),
  check(
    "matching_card_uses_external_exact_height",
    /\.frame\(width: width,\s*height: height\)/.test(matchingCardSource),
    "V2MatchingOptionCard must use its height parameter as the exact semantic height for the estimated line count."
  ),
  check(
    "matching_card_uses_external_horizontal_padding",
    /\.padding\(\.horizontal,\s*horizontalPadding\)/.test(matchingCardSource),
    "V2MatchingOptionCard must use its horizontalPadding parameter."
  ),
  check(
    "matching_card_has_no_outer_vertical_padding",
    !/ZStack\s*\{[\s\S]*?\}\s*\.padding\(\.vertical,/.test(matchingCardSource),
    "V2MatchingOptionCard must not add vertical padding around the whole card because it makes visual row gaps drift."
  ),
  check(
    "matching_card_has_no_private_fixed_width_metrics",
    !/static let (width|minHeight|textWidth): CGFloat =/.test(extractMatchingCardPrivateMetrics(source.questionComponents)),
    "V2MatchingOptionCard must not hide fixed width/minHeight/textWidth inside its private Metrics."
  ),
  check(
    "matching_screen_passes_card_metrics",
    /width:\s*V2MatchingPageMetrics\.optionCardWidth/.test(matchingScreenSource)
      && /let cardHeight = V2MatchingPageMetrics\.optionCardHeight\(for:\s*question\.matchingPairs\)/.test(matchingScreenSource)
      && /height:\s*cardHeight/.test(matchingScreenSource)
      && /horizontalPadding:\s*V2MatchingPageMetrics\.optionCardHorizontalPadding/.test(matchingScreenSource),
    "V2MatchingQuestionView must pass screen metrics into V2MatchingOptionCard."
  ),
  check(
    "matching_screen_uses_uniform_dynamic_heights",
    /static func optionCardHeight\(for pairs: \[V2MatchingPairData\]\) -> CGFloat/.test(matchingScreenSource)
      && /optionCardOneLineHeight/.test(matchingScreenSource)
      && /optionCardTwoLineHeight/.test(matchingScreenSource)
      && /optionCardThreeLineHeight/.test(matchingScreenSource),
    "Matching option cards should use one uniform compact height per question based on the longest option."
  ),
  check(
    "matching_screen_has_no_per_option_height",
    !/optionCardHeight\(for:\s*pair\.(left|right)\)|rowHeights|optionRowHeights/.test(matchingScreenSource),
    "Matching screen must keep all option cards in one question at the same height."
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

function extractMatchingScreenSource(fileSource) {
  const start = fileSource.indexOf("struct V2MatchingQuestionView");
  const end = fileSource.indexOf("private enum V2QuestionFeedbackMetrics");
  if (start < 0 || end < 0 || end <= start) return fileSource;
  return fileSource.slice(start, end);
}
