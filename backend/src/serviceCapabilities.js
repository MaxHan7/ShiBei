export const SERVICE_CAPABILITIES = Object.freeze({
  legacyChapterGeneration: true,
  v2ChapterGeneration: true,
  v2ReviewSessions: true,
  favoriteQuestions: true,
  notifications: true,
  sourceAnchors: true
});

export function buildServiceCapabilities() {
  return { ...SERVICE_CAPABILITIES };
}
