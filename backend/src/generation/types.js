export const QUESTION_TYPES = ["multiple_choice", "true_false", "scenario_judgment"];

export const KNOWLEDGE_TYPES = [
  "concept",
  "judgment",
  "method",
  "scenario",
  "counterexample",
  "comparison",
  "step"
];

export const QUALITY_DIMENSIONS = [
  "sourceSupport",
  "answerUniqueness",
  "understandingDepth",
  "clarity",
  "distractorQuality",
  "reviewValue"
];

export const GENERATION_STATUSES = [
  "submitted",
  "extracting_content",
  "generating_points",
  "generating_questions",
  "quality_checking",
  "auto_regenerating_questions",
  "completed",
  "failed_extract_article",
  "failed_extract_video",
  "failed_points",
  "failed_questions",
  "failed_no_qualified_questions"
];

export const STATUS_TEXT = {
  submitted: "已提交，等待处理",
  extracting_content: "正在提取正文",
  generating_points: "正在生成知识点",
  generating_questions: "正在生成题目",
  quality_checking: "正在检查题目质量",
  auto_regenerating_questions: "正在重新生成题目",
  completed: "已生成",
  failed_extract_article: "文章正文提取失败",
  failed_extract_video: "视频文本提取失败",
  failed_points: "知识点生成失败",
  failed_questions: "题目生成失败",
  failed_no_qualified_questions: "题目生成失败"
};
