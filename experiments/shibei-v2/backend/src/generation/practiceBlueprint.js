const MEMORY_ANGLE_BLUEPRINTS = {
  core_understanding: {
    label: "核心理解",
    goal: "让用户抓住这个知识点的核心主张，并能判断什么说法真正表达了原文意思",
    preferredQuestionType: "multiple_choice",
    sourceEvidenceRole: "definition",
    avoid: "不要问原文提到了什么，不要只做关键词识别、原文填空或字面复述"
  },
  misconception_boundary: {
    label: "边界辨析",
    goal: "让用户分清这个知识点真实容易混淆、误用或越界的地方",
    preferredQuestionType: "true_false",
    sourceEvidenceRole: "contrast",
    avoid: "不要设计一眼排除的错误选项，误区必须能在题干、选项或原文边界中被看见"
  },
  scenario_application: {
    label: "场景迁移",
    goal: "让用户把这个知识点迁移到新场景中做判断或选择行动",
    preferredQuestionType: "scenario_judgment",
    sourceEvidenceRole: "method",
    avoid: "不要把原文句子换壳成场景题，也不要编造来源无法解释的业务细节"
  }
};

export const MEMORY_ANGLE_ORDER = [
  "core_understanding",
  "misconception_boundary",
  "scenario_application"
];

export function buildPracticeBlueprintForPoint(point = {}, {
  targetCount = 3,
  preferredQuestionType = ""
} = {}) {
  const count = Math.max(1, Math.min(3, Number(targetCount) || 1));
  const angles = chooseMemoryAnglesForPoint(point, count);
  return angles.map((memoryAngle, index) => {
    const base = MEMORY_ANGLE_BLUEPRINTS[memoryAngle];
    return {
      id: `${point.id || "point"}-${memoryAngle}`,
      sequence: index + 1,
      memoryAngle,
      label: base.label,
      goal: goalForPoint(point, base.goal),
      preferredQuestionType: preferredTypeForAngle(memoryAngle, preferredQuestionType),
      sourceEvidenceRole: sourceRoleForAngle(memoryAngle, point),
      avoid: base.avoid
    };
  });
}

export function blueprintItemForQuestion(point = {}, question = {}) {
  const blueprint = Array.isArray(point.practiceBlueprint) ? point.practiceBlueprint : [];
  const byId = blueprint.find((item) => item.id && item.id === question.blueprintItemId);
  if (byId) return byId;
  const byAngle = blueprint.find((item) => item.memoryAngle && item.memoryAngle === question.memoryAngle);
  return byAngle || null;
}

export function blueprintAlignment(question = {}, point = {}) {
  const item = blueprintItemForQuestion(point, question);
  if (!item) {
    return {
      blueprintItemId: question.blueprintItemId || "",
      blueprintGoal: question.blueprintGoal || "",
      blueprintPreferredQuestionType: "",
      memoryAngleFitScore: question.memoryAngle ? 3 : 1,
      blueprintAlignmentScore: question.memoryAngle ? 3 : 1
    };
  }

  const memoryAngleFitScore = question.memoryAngle === item.memoryAngle ? 5 : 2;
  const text = `${question.stem || ""} ${question.correctUnderstanding || ""} ${question.commonMisconception || ""}`;
  const goalScore = scoreGoalFit(text, item.memoryAngle);
  return {
    blueprintItemId: item.id,
    blueprintGoal: item.goal,
    blueprintPreferredQuestionType: item.preferredQuestionType || "",
    memoryAngleFitScore,
    blueprintAlignmentScore: Math.round(((memoryAngleFitScore + goalScore) / 2) * 10) / 10
  };
}

export function pedagogyDiagnosticsForQuestion(question = {}, point = {}, blueprint = {}) {
  const memoryAngle = question.memoryAngle || blueprint.memoryAngle || "";
  const coreRecallFitScore = scoreCoreRecallFit(question);
  const coreUnderstandingScore = coreRecallFitScore;
  const boundaryDiscriminationFitScore = scoreBoundaryFit(question);
  const scenarioTransferFitScore = scoreScenarioFit(question);
  const scenarioApplicationScore = scenarioTransferFitScore;
  const cognitiveActionFitScore = scoreCognitiveActionFit({
    memoryAngle,
    coreRecallFitScore: coreUnderstandingScore,
    boundaryDiscriminationFitScore,
    scenarioTransferFitScore: scenarioApplicationScore
  });
  const evidenceLearningValueScore = scoreEvidenceLearningValue(question);
  const reasons = pedagogyReasons({
    question,
    memoryAngle,
    coreRecallFitScore: coreUnderstandingScore,
    boundaryDiscriminationFitScore,
    scenarioTransferFitScore: scenarioApplicationScore,
    cognitiveActionFitScore,
    evidenceLearningValueScore
  });
  const cognitiveActionIssue = primaryCognitiveActionIssue(reasons);
  const warnings = [];
  const preferredQuestionType = blueprint.preferredQuestionType || blueprint.blueprintPreferredQuestionType || "";
  if (question.type && preferredQuestionType && question.type !== preferredQuestionType) {
    warnings.push(cognitiveActionFitScore >= 4 ? "type_fit_warning" : "type_does_not_serve_cognitive_action");
  }

  return {
    pedagogyDiagnostics: {
      cognitiveAction: memoryAngle,
      coreRecallFitScore: coreUnderstandingScore,
      coreUnderstandingScore,
      boundaryDiscriminationFitScore,
      scenarioTransferFitScore: scenarioApplicationScore,
      scenarioApplicationScore,
      cognitiveActionFitScore,
      evidenceLearningValueScore,
      cognitiveActionIssue,
      warnings,
      reasons
    },
    cognitiveActionFitScore,
    coreRecallFitScore: coreUnderstandingScore,
    coreUnderstandingScore,
    boundaryDiscriminationFitScore,
    scenarioTransferFitScore: scenarioApplicationScore,
    scenarioApplicationScore,
    cognitiveActionIssue,
    practiceProgressionScore: null,
    practiceDuplicateRiskScore: 1,
    evidenceLearningValueScore,
    sourceReuseLearningReason: ""
  };
}

export function typeDiversityReasonForSelection(selected = []) {
  if (selected.length < 3) return "";
  const uniqueTypes = new Set(selected.map((question) => question.type).filter(Boolean));
  if (uniqueTypes.size > 1) return "";
  const uniqueAngles = new Set(selected.map((question) => question.memoryAngle).filter(Boolean));
  if (uniqueAngles.size >= 3) {
    return "same_type_but_distinct_cognitive_actions";
  }
  return "same_type_and_insufficient_cognitive_diversity";
}

function chooseMemoryAnglesForPoint(point, count) {
  if (count >= 3) return [...MEMORY_ANGLE_ORDER];
  if (count === 1) return ["core_understanding"];

  const role = String(point.structureRole || "");
  const text = [
    point.title,
    point.keyClaim,
    point.coverageReason,
    ...(Array.isArray(point.questionAngles) ? point.questionAngles : [])
  ].join(" ");

  if (/场景|应用|迁移|方法|步骤|workflow|流程|实践|案例/.test(text) || role === "method_step") {
    return ["core_understanding", "scenario_application"];
  }
  return ["core_understanding", "misconception_boundary"];
}

function preferredTypeForAngle(memoryAngle, fallbackType) {
  if (memoryAngle === "scenario_application") return "scenario_judgment";
  if (memoryAngle === "misconception_boundary") return "true_false";
  return fallbackType || MEMORY_ANGLE_BLUEPRINTS[memoryAngle]?.preferredQuestionType || "multiple_choice";
}

function sourceRoleForAngle(memoryAngle, point = {}) {
  const role = String(point.evidenceRole || point.sourceEvidenceRole || "");
  if (role && memoryAngle === "core_understanding") return role;
  if (memoryAngle === "scenario_application") return /case|example/.test(role) ? role : "method";
  if (memoryAngle === "misconception_boundary") return /boundary|contrast/.test(role) ? role : "contrast";
  return MEMORY_ANGLE_BLUEPRINTS[memoryAngle]?.sourceEvidenceRole || "general";
}

function goalForPoint(point = {}, fallbackGoal) {
  const claim = String(point.keyClaim || point.summary || "").trim();
  if (!claim) return fallbackGoal;
  return `${fallbackGoal}；围绕这个主张：${claim}`;
}

function scoreGoalFit(text, memoryAngle) {
  if (!text) return 1;
  if (memoryAngle === "scenario_application") {
    return /场景|如果|团队|项目|应该|选择|行动|处理|迁移|应用/.test(text) ? 5 : 3;
  }
  if (memoryAngle === "misconception_boundary") {
    return /误区|边界|区别|混淆|错误|不应|不能|为什么.*不|相反/.test(text) ? 5 : 3;
  }
  return /核心|主张|本质|关键|理解|意味着|不是.*而是/.test(text) ? 5 : 4;
}

function scoreCoreRecallFit(question) {
  const text = compact([
    question.stem,
    question.correctUnderstanding,
    question.explanation
  ]);
  if (!text) return 1;
  if (/原文.*提到|文中.*提到|关键词|哪句|哪一项.*出现|填空|根据原文.*哪项/.test(text)) return 2;
  if (/核心|主张|本质|关键|意味着|为什么|不是.*而是|理解|判断/.test(text)) return 5;
  if (/以下哪种|哪项理解|哪种说法/.test(text)) return 4;
  return 3;
}

function scoreBoundaryFit(question) {
  const text = compact([
    question.stem,
    question.correctUnderstanding,
    question.commonMisconception,
    question.explanation,
    optionTexts(question)
  ]);
  if (!text) return 1;
  const hasBoundaryCue = /误区|边界|混淆|区别|对比|错误|不应|不能|相反|限制|适用|不适合|为什么.*不/.test(text);
  const misconception = String(question.commonMisconception || "");
  const options = optionTexts(question);
  const reflectedInOptions = misconception && options && keywordOverlap(misconception, options);
  if (isGenericMisconception(misconception)) return hasBoundaryCue ? 3 : 2;
  if (hasBoundaryCue && reflectedInOptions) return 5;
  if (hasBoundaryCue && misconception.length >= 18) return 4;
  if (hasBoundaryCue || misconception.length >= 18) return 3;
  return 2;
}

function scoreScenarioFit(question) {
  const stem = String(question.stem || "");
  const text = compact([
    stem,
    question.correctUnderstanding,
    question.explanation,
    optionTexts(question)
  ]);
  if (!text) return 1;
  const hasScenarioCue = /如果|场景|团队|项目|用户|应该|选择|行动|处理|遇到|迁移|应用|实践|工作流|流程|案例/.test(text);
  const stemSourceOverlap = overlapRatio(compact(stem), compact(question.sourceSnippet || ""));
  if (/原文.*提到|根据原文|文中.*场景/.test(stem)) return 2;
  if (hasScenarioCue && stemSourceOverlap < 0.55) return 5;
  if (hasScenarioCue) return 4;
  if (/如何|怎么|做法|策略|取舍/.test(text)) return 3;
  return 2;
}

function scoreCognitiveActionFit({
  memoryAngle,
  coreRecallFitScore,
  boundaryDiscriminationFitScore,
  scenarioTransferFitScore
}) {
  if (memoryAngle === "misconception_boundary") return boundaryDiscriminationFitScore;
  if (memoryAngle === "scenario_application") return scenarioTransferFitScore;
  if (memoryAngle === "core_understanding") return coreRecallFitScore;
  return roundScore((coreRecallFitScore + boundaryDiscriminationFitScore + scenarioTransferFitScore) / 3);
}

function scoreEvidenceLearningValue(question) {
  const precision = Number(question.sourcePrecisionScore || question.sourceContextSelection?.sourcePrecisionScore || 0);
  const minimality = Number(question.sourceMinimalityScore || question.sourceContextSelection?.sourceMinimalityScore || 0);
  const diversity = Number(question.sourceEvidenceDiversityScore || question.sourceContextSelection?.sourceEvidenceDiversityScore || 0);
  const sourceText = String(question.sourceSnippet || "");
  const lengthScore = sourceText.length > 520 ? 2 : sourceText.length > 320 ? 3 : sourceText.length >= 40 ? 5 : 3;
  const available = [precision, minimality, diversity || lengthScore, lengthScore].filter((score) => Number.isFinite(score) && score > 0);
  return available.length ? roundScore(available.reduce((sum, score) => sum + score, 0) / available.length) : 3;
}

function pedagogyReasons({
  memoryAngle,
  coreRecallFitScore,
  boundaryDiscriminationFitScore,
  scenarioTransferFitScore,
  cognitiveActionFitScore,
  evidenceLearningValueScore
}) {
  const reasons = [];
  if (cognitiveActionFitScore < 3) reasons.push("cognitive_action_weak");
  if (memoryAngle === "core_understanding" && coreRecallFitScore < 4) reasons.push("core_claim_too_literal");
  if (memoryAngle === "misconception_boundary" && boundaryDiscriminationFitScore < 4) reasons.push("boundary_confusion_not_real");
  if (memoryAngle === "scenario_application" && scenarioTransferFitScore < 4) reasons.push("scenario_is_restatement");
  if (evidenceLearningValueScore < 3) reasons.push("weak_evidence_learning_value");
  return reasons;
}

function primaryCognitiveActionIssue(reasons = []) {
  const priority = [
    "core_claim_too_literal",
    "boundary_confusion_not_real",
    "scenario_is_restatement",
    "cognitive_action_weak"
  ];
  return priority.find((reason) => reasons.includes(reason)) || "";
}

function isGenericMisconception(value) {
  return /没有理解|理解片面|忽略.*关键|只是.*表面|不够深入|混淆概念|误解原文|理解错误/.test(String(value || ""))
    || String(value || "").trim().length < 18;
}

function optionTexts(question) {
  return Array.isArray(question.options) ? question.options.map((option) => option.text || "").join(" ") : "";
}

function compact(parts) {
  if (Array.isArray(parts)) return parts.filter(Boolean).join(" ").replace(/\s+/g, "");
  return String(parts || "").replace(/\s+/g, "");
}

function keywordOverlap(left, right) {
  const leftKeywords = supportKeywords(left);
  const rightBody = compact(right);
  return leftKeywords.some((keyword) => rightBody.includes(keyword));
}

function supportKeywords(value) {
  return [...new Set(String(value || "")
    .replace(/[，。！？；：、,.!?;:()[\]{}"'“”‘’|/\\-]/g, " ")
    .split(/\s+/)
    .flatMap((word) => {
      if (/[\u4e00-\u9fff]/.test(word)) {
        const chars = [...word].filter((char) => /[\u4e00-\u9fff]/.test(char));
        const tokens = [];
        for (let length = 2; length <= Math.min(4, chars.length); length += 1) {
          for (let index = 0; index <= chars.length - length; index += 1) {
            tokens.push(chars.slice(index, index + length).join(""));
          }
        }
        return tokens;
      }
      return word.length >= 3 ? [word.toLowerCase()] : [];
    })
    .filter((token) => token.length >= 2))].slice(0, 40);
}

function overlapRatio(left, right) {
  if (!left || !right) return 0;
  const shorter = left.length < right.length ? left : right;
  const longer = left.length < right.length ? right : left;
  let hits = 0;
  for (const char of new Set([...shorter])) {
    if (longer.includes(char)) hits += 1;
  }
  return hits / Math.max(1, new Set([...shorter]).size);
}

function roundScore(value) {
  return Math.max(1, Math.min(5, Math.round(Number(value || 1) * 10) / 10));
}
