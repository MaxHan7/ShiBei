export function buildUnitSourceContext(
  sourceMap,
  unit,
  { radius = 1, fallbackBlockCount = 6 } = {}
) {
  const source = sourceMap?.source || {};
  const blocks = Array.isArray(sourceMap?.blocks) ? sourceMap.blocks : [];
  const anchorBlockIds = Array.isArray(unit?.sourceAnchor?.blockIds) ? unit.sourceAnchor.blockIds : [];
  const selectedIndexes = indexesForBlockIds(blocks, anchorBlockIds, radius);
  const fallbackUsed = selectedIndexes.length === 0;
  const finalIndexes = fallbackUsed
    ? Array.from({ length: Math.min(fallbackBlockCount, blocks.length) }, (_, index) => index)
    : selectedIndexes;
  const selectedBlocks = finalIndexes.map((index) => blocks[index]).filter(Boolean);

  return {
    source,
    blocks: selectedBlocks,
    sourceContextNote: {
      mode: "unit_window",
      unitId: unit?.id || "",
      anchorId: unit?.sourceAnchor?.id || "",
      anchorBlockIds,
      selectedBlockIds: selectedBlocks.map((block) => block.id),
      radius,
      fallbackUsed,
      fullBlockCount: blocks.length,
      selectedBlockCount: selectedBlocks.length
    }
  };
}

export function buildPlanSourceContext(
  sourceMap,
  plan,
  { radius = 1, fallbackBlockCount = 10 } = {}
) {
  const source = sourceMap?.source || {};
  const blocks = Array.isArray(sourceMap?.blocks) ? sourceMap.blocks : [];
  const units = Array.isArray(plan?.units) ? plan.units : [];
  const selected = new Set();

  for (const unit of units) {
    for (const index of indexesForBlockIds(blocks, unit?.sourceAnchor?.blockIds || [], radius)) {
      selected.add(index);
    }
  }

  const fallbackUsed = selected.size === 0;
  const finalIndexes = fallbackUsed
    ? Array.from({ length: Math.min(fallbackBlockCount, blocks.length) }, (_, index) => index)
    : Array.from(selected).sort((a, b) => a - b);
  const selectedBlocks = finalIndexes.map((index) => blocks[index]).filter(Boolean);

  return {
    source,
    blocks: selectedBlocks,
    sourceContextNote: {
      mode: "plan_union_window",
      selectedUnitCount: units.length,
      selectedBlockIds: selectedBlocks.map((block) => block.id),
      radius,
      fallbackUsed,
      fullBlockCount: blocks.length,
      selectedBlockCount: selectedBlocks.length
    }
  };
}

function indexesForBlockIds(blocks, blockIds, radius) {
  const idToIndex = new Map(blocks.map((block, index) => [block.id, index]));
  const selected = new Set();

  for (const id of blockIds) {
    const index = idToIndex.get(id);
    if (!Number.isInteger(index)) continue;
    const start = Math.max(0, index - radius);
    const end = Math.min(blocks.length - 1, index + radius);
    for (let current = start; current <= end; current += 1) {
      selected.add(current);
    }
  }

  return Array.from(selected).sort((a, b) => a - b);
}
