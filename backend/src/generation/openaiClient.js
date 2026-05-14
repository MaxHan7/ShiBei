const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEEPSEEK_CHAT_URL = "https://api.deepseek.com/chat/completions";

export async function callOpenAIJson({ system, user, schemaName, schema }) {
  if (process.env.DEEPSEEK_API_KEY || process.env.AI_PROVIDER === "deepseek") {
    return callDeepSeekJson({ system, user, schemaName, schema });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("缺少模型 API Key。请先设置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY。");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      text: {
        format: {
          type: "json_schema",
          name: schemaName,
          strict: true,
          schema
        }
      }
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI 请求失败：${response.status}`;
    throw new Error(message);
  }

  const text = extractResponseText(payload);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("模型返回内容不是可解析 JSON，请重试。");
  }
}

async function callDeepSeekJson({ system, user, schemaName, schema }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 DEEPSEEK_API_KEY。请先在启动后端前设置环境变量。");
  }

  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
  const response = await fetch(DEEPSEEK_CHAT_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: `${system}\n\n你必须只输出一个 JSON 对象，不要输出 Markdown、代码块或解释文字。JSON 必须符合这个 schema 名称：${schemaName}。\n\nJSON Schema:\n${JSON.stringify(schema)}`
        },
        { role: "user", content: user }
      ],
      response_format: { type: "json_object" },
      stream: false,
      temperature: 0.2
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.message || `DeepSeek 请求失败：${response.status}`;
    throw new Error(message);
  }

  const text = payload?.choices?.[0]?.message?.content;
  if (!text) throw new Error("DeepSeek 没有返回结构化文本。");

  try {
    return JSON.parse(stripCodeFence(text));
  } catch {
    throw new Error("模型返回内容不是可解析 JSON，请重试。");
  }
}

function extractResponseText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const output = payload?.output || [];
  for (const item of output) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }
  throw new Error("模型没有返回结构化文本。");
}

function stripCodeFence(text) {
  return String(text)
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}
