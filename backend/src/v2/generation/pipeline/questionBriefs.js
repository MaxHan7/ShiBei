export function buildQuestionBriefsByUnit({
  taskBriefPlan,
  unitKnowledgeMap,
  unitSourceContexts
}) {
  const microByUnit = new Map(
    (unitKnowledgeMap?.units || []).map((unit) => [
      unit.unitId,
      new Map((unit.microKnowledgePoints || []).map((micro) => [micro.microId, micro]))
    ])
  );
  const sourceContextByUnit = unitSourceContexts instanceof Map
    ? unitSourceContexts
    : new Map(Object.entries(unitSourceContexts || {}));

  return new Map(
    (taskBriefPlan?.units || []).map((unitPlan) => {
      const goalsById = new Map((unitPlan.practiceGoals || []).map((goal) => [goal.id, goal]));
      const unitMicro = microByUnit.get(unitPlan.unitId) || new Map();
      const sourceContext = compactSourceContext(sourceContextByUnit.get(unitPlan.unitId));

      return [
        unitPlan.unitId,
        {
          unitId: unitPlan.unitId,
          sourceContext,
          questionBriefs: (unitPlan.questionPlans || []).map((questionPlan) => {
            const goal = goalsById.get(questionPlan.practiceGoalId);
            const micros = (questionPlan.microIds || [])
              .map((id) => unitMicro.get(id))
              .filter(Boolean);

            return {
              questionPlanId: questionPlan.id,
              type: questionPlan.type,
              purpose: questionPlan.purpose,
              ...(questionPlan.relationType ? { relationType: questionPlan.relationType } : {}),
              practiceGoal: {
                id: goal?.id,
                kind: goal?.kind,
                target: goal?.target,
                commonMisconception: goal?.commonMisconception
              },
              evidence: {
                microIds: Array.isArray(questionPlan.microIds) ? questionPlan.microIds : [],
                microTitles: micros.map((micro) => micro.title).filter(Boolean),
                microSummaries: micros.map((micro) => micro.summary).filter(Boolean),
                evidenceAngles: micros.flatMap((micro) =>
                  micro.primaryEvidenceAngle
                    ? [micro.primaryEvidenceAngle]
                    : Array.isArray(micro.suggestedEvidenceAngles)
                      ? micro.suggestedEvidenceAngles
                      : []
                )
              },
              sourceAnchorId: questionPlan.sourceAnchorId
            };
          })
        }
      ];
    })
  );
}

function compactSourceContext(sourceContext) {
  return {
    blocks: (sourceContext?.blocks || []).map((block) => ({
      id: block.id,
      type: block.type,
      text: block.text
    })),
    sourceContextNote: sourceContext?.sourceContextNote || {}
  };
}
