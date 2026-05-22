const fallbackEntries = [
  {
    date: "2026-05-22",
    title: "进入出题可信度闭环阶段",
    phase: "出题质量系统",
    problem: "知识点提取开始变稳，但低置信题暴露出来源支撑、解释一致性和干扰项质量问题。",
    changes: ["明确下一轮优先处理来源支撑和解释一致性。", "把低置信题从单一标签拆成后续可诊断的质量风险。"],
    screenshots: [{ src: "assets/2026-05-22-quality-loop.svg", caption: "出题系统从单点 prompt 调整转向质量闭环" }],
    result: "产品迭代重心从“能生成题”转向“题目什么时候可信”。",
    next: "实现来源支撑、解释一致性和低置信分层的后处理链路。",
    commits: []
  },
  {
    date: "2026-05-21",
    title: "搭建 AI 预标注质量工作台",
    phase: "质量评测",
    problem: "单篇人工检查太慢，无法稳定发现出题系统的问题分布。",
    changes: ["新增独立质量工作台。", "输入文章后自动生成题目、AI 预标注，并保留人工确认字段。", "扩展测试集报告和人工评分维度。"],
    screenshots: [{ src: "assets/2026-05-21-quality-workbench.svg", caption: "质量工作台把生成、预标注和人工检查放到同一页面" }],
    result: "出题系统开始从“凭手感修”进入“批量评测 + 人工确认 + 数据统计”的循环。",
    next: "用固定测试集持续比较每轮 prompt 和规则改动。",
    commits: ["7c6c1b3"]
  },
  {
    date: "2026-05-18",
    title: "完善复习体验和解释来源",
    phase: "SwiftUI 体验打磨",
    problem: "用户做完最后一题会直接进总结，解释页来源片段也不够容易回到原文理解。",
    changes: ["最后一题答完后先进入解释页。", "完整来源页支持跳到对应原文区域。", "题卡选项左对齐，正确答案位置做稳定分散。"],
    screenshots: [{ src: "assets/2026-05-18-review-flow.svg", caption: "复习流程开始强调解释和原文回看" }],
    result: "复习不再只是答题，而是形成“答题 -> 解释 -> 回看来源 -> 总结”的闭环。",
    next: "继续提升题目本身的来源支撑和解释可信度。",
    commits: ["3631a81", "684623f", "5cc3fa5"]
  },
  {
    date: "2026-05-17",
    title: "把真机生成接到 Railway 云端",
    phase: "云端原型",
    problem: "真机只能跑 mock 或本地 API，生成状态容易卡住，部署后内存数据也会丢失。",
    changes: ["部署 Node 后端到 Railway。", "增加云端 API 模式。", "接入 PostgreSQL 和匿名设备 ID 保存章节与通知。"],
    screenshots: [{ src: "assets/2026-05-17-cloud-api.svg", caption: "从本地 mock 走向可真机访问的云端生成" }],
    result: "真机可以提交真实文章到云端生成，章节数据也能跨部署保存。",
    next: "稳定题目生成质量，减少生成失败和低质量题入池。",
    commits: ["ac76759", "ee518e0", "ab5086e"]
  },
  {
    date: "2026-05-16",
    title: "完成 SwiftUI Mock 主流程",
    phase: "iOS 原型",
    problem: "HTML Demo 可用，但还不是原生 iOS 体验，无法验证真机交互和系统导航。",
    changes: ["创建 SwiftUI 工程。", "迁移首页、添加、章节、通知、复习、解释、来源和总结流程。", "用系统 TabView 和自定义图标打磨底部导航。"],
    screenshots: [{ src: "assets/2026-05-16-swiftui-mock.svg", caption: "SwiftUI mock 把 HTML 产品流迁移到原生 iOS" }],
    result: "iOS 端可以无网络走通完整 mock 流程，为后续接 API 打下基础。",
    next: "接入本地 API，再逐步迁移到云端服务。",
    commits: []
  },
  {
    date: "2026-05-14",
    title: "完善 HTML Demo 和核心出题系统",
    phase: "HTML Demo",
    problem: "早期原型能展示概念，但视觉、复习流和失败恢复都不够完整。",
    changes: ["统一暖白、橙色主按钮、黄色强调和 15px 圆角视觉体系。", "补齐生成、失败、通知、复习、反馈和来源流程。", "开始建立题目质量检查和失败恢复机制。"],
    screenshots: [{ src: "assets/2026-05-14-html-demo.svg", caption: "HTML Demo 承担第一轮产品体验验证" }],
    result: "HTML Demo 成为 SwiftUI 迁移的视觉和流程基准。",
    next: "用 Xcode 创建 SwiftUI 工程，迁移成可真机运行的 iOS mock。",
    commits: ["994764e"]
  }
];

async function loadEntries() {
  if (Array.isArray(window.iterationEntries) && window.iterationEntries.length) {
    return window.iterationEntries;
  }

  try {
    const manifestResponse = await fetch("./entries/index.json", { cache: "no-store" });
    if (!manifestResponse.ok) throw new Error("manifest unavailable");
    const manifest = await manifestResponse.json();
    const files = Array.isArray(manifest.files) ? manifest.files : [];
    const entries = await Promise.all(files.map(async (file) => {
      const response = await fetch(`./entries/${file}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`entry unavailable: ${file}`);
      return response.json();
    }));
    return entries.flat().filter(Boolean);
  } catch {
    return fallbackEntries;
  }
}

function renderSummary(entries) {
  const phases = new Set(entries.map((entry) => entry.phase));
  const commits = entries.flatMap((entry) => entry.commits || []).filter(Boolean);
  document.querySelector("#summary").innerHTML = [
    { value: entries.length, label: "已记录核心迭代" },
    { value: phases.size, label: "覆盖产品阶段" },
    { value: commits.length, label: "关联关键提交" }
  ].map((item) => `
    <article class="summary-card">
      <strong>${escapeHtml(String(item.value))}</strong>
      <span>${escapeHtml(item.label)}</span>
    </article>
  `).join("");
}

function renderTimeline(entries) {
  const timeline = document.querySelector("#timeline");
  if (!entries.length) {
    timeline.innerHTML = `<div class="empty-state">还没有迭代记录。</div>`;
    return;
  }

  timeline.innerHTML = entries
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map(renderEntry)
    .join("");
}

function renderEntry(entry) {
  return `
    <article class="entry-card">
      <aside>
        <div class="entry-date">${escapeHtml(formatDate(entry.date))}</div>
        <span class="entry-phase">${escapeHtml(entry.phase || "产品迭代")}</span>
      </aside>
      <div class="entry-main">
        <h3>${escapeHtml(entry.title || "未命名迭代")}</h3>
        <div class="entry-grid">
          ${renderTextSection("问题", entry.problem)}
          ${renderListSection("修改", entry.changes)}
          ${renderTextSection("效果", entry.result)}
        </div>
        ${renderShots(entry.screenshots)}
        <div class="entry-section">
          <h4>下一步</h4>
          <p>${escapeHtml(entry.next || "继续观察产品反馈。")}</p>
        </div>
        ${renderCommits(entry.commits)}
      </div>
    </article>
  `;
}

function renderTextSection(title, text) {
  return `
    <section class="entry-section">
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(text || "暂无记录。")}</p>
    </section>
  `;
}

function renderListSection(title, list) {
  const items = Array.isArray(list) && list.length ? list : ["暂无记录。"];
  return `
    <section class="entry-section">
      <h4>${escapeHtml(title)}</h4>
      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
  `;
}

function renderShots(shots) {
  if (!Array.isArray(shots) || !shots.length) return "";
  return `
    <div class="shots">
      ${shots.map((shot) => `
        <figure class="shot">
          <img src="${escapeAttribute(shot.src || "")}" alt="${escapeAttribute(shot.caption || "迭代截图")}">
          <figcaption>${escapeHtml(shot.caption || "迭代截图")}</figcaption>
        </figure>
      `).join("")}
    </div>
  `;
}

function renderCommits(commits) {
  const valid = Array.isArray(commits) ? commits.filter(Boolean) : [];
  if (!valid.length) return "";
  return `<div class="commit-row">${valid.map((commit) => `<span class="commit">${escapeHtml(commit)}</span>`).join("")}</div>`;
}

function formatDate(date) {
  if (!date) return "日期未记录";
  return date.replaceAll("-", ".");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

loadEntries().then((entries) => {
  renderSummary(entries);
  renderTimeline(entries);
});
