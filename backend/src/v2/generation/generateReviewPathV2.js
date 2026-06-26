import {
  activeV2GenerationStages,
  runV2GenerationProgram,
  V2_GENERATION_STAGES
} from "./pipeline/v2GenerationProgram.js";

export { activeV2GenerationStages, V2_GENERATION_STAGES };

export async function generateReviewPathV2(article, options = {}) {
  return runV2GenerationProgram(article, options);
}
