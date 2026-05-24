const STORAGE_KEY = "shibei-demo-state-v1";
const INITIAL_MASTERY_SCORE = 50;
const REINFORCEMENT_GAP = 3;

const sampleText = `产品经理如何把 Claude 变成自己的工作系统丨Aakash

Pawel 是欧洲很有影响力的 AI PM 作者，LinkedIn 关注者超过 20 万，newsletter 订阅超过 10 万，还做了一个 PM skills marketplace，GitHub 上有 1 万 star。Aakash 在开场提到，Pawel 之前做过 AI 产品管理、n8n、用户发现的几期内容，这次回来讲的是一套完整 Claude PM 操作系统：Cowork、Claude Code、Dispatch、Skills、MCP connector、自我改进知识库，以及手机上的远程工作流。整场 90 多分钟，最有价值的部分不只是工具清单，更是 PM 如何把日常工作拆成可积累、可复用、可验证的系统，并让系统在下一次任务里带着记忆继续工作。

Anthropic 的速度，来自重写流程。Aakash 先抛出一个数字：Pawel 追踪到 Anthropic 在 52 天里发布了 74 次。Pawel 看到的重点，是很多公司正在围绕 AI 能做到的事，重新设计流程。产品经理、产品营销、设计师、工程师的边界正在靠近。原本需要单独角色处理的原型、测试、release notes、基于设计系统生成界面，开始被自动化。过去 PM 把需求交给设计和工程，今天更常见的动作是自己先用 Claude 做出初版材料、原型或分析，再带着更具体的证据进入协作。"他们围绕当前可能做到的事重新设计流程，而非只用 AI 替换原来的步骤。"

Pawel 对 PM 的判断很重：产品经理不能只会访谈用户、往 backlog 里写条目。PM 需要理解技术，熟悉过去给工程师用的工具，比如 terminal；也要理解策略、收入、业务目标和产品战略怎样连接。Aakash 听完说，这是他做产品 16 年里见过最接近产品“bare metal”的版本。PM 的工作没有消失，但岗位正在变成更宽的个人贡献者。他把未来叫作 super PM 或 super individual contributor：带着 PM 的重心，同时懂营销、战略、技术、产品和客户沟通。

聊天框已经装不下 PM 的工作。Pawel 说自己几乎不用普通 chat，只会在窗口刚好开着时问一句语法对不对。原因很现实：PM 开始一个任务时，往往不知道后面会需要什么。用 chat 起步，做着做着就会撞墙。你可能想从桌面离开，chat 不能在手机上接着跑；你可能想把讨论内容生成 HTML，再导出成 infographic 放进邮件；你可能中途发现要写一点代码。普通聊天框会让上下文断在一个窗口里。"已经没有什么好理由，只通过普通网页聊天框和 Claude 对话了。"

他更愿意从 Cowork、Dispatch 或 Claude Code 开始，因为这些界面可以在不同任务形态之间切换。Aakash 的比喻更狠：大多数人一直停留在 chat，就像只拿 Photoshop 裁图。Claude 对 PM 的价值，不在于多回答几个问题，而在于接管真实文件、真实系统和连续流程。如果一次工作最后要落到邮件、表格、PDF、设计稿、代码库或 CRM，入口就不该只是一段聊天记录。Pawel 举的场景很典型：讨论到一半想生成 HTML 页面，再导出成 infographic 放进邮件，chat 会迫使你另起会话、重讲上下文。

Aakash 还插入了自己的 AI 产品案例：他的 job search OS 有 16 个 agents，用户反馈会出现 hallucination 或选错工具。他后来发现问题不在提示词，而在没有逐步观察 agent 做了什么。接入 tracing 后，他能看到每次 tool call、每个决策，并让 Claude Code 反过来建议 eval 指标。一个简历反馈 agent 曾把招聘信息里的 Python 误读成 React，eval 跑出来同类错误约 12%，修完后降到 2% 以下。

Cowork 做的是文件和流程。Pawel 现场拿一个桌面文件夹做演示，里面放着两个月收集来的发票，有 PDF，也有图片，还有重复文件。他让 Cowork 分析这些发票，按月份创建 January、February、March、April 文件夹，识别重复项，再把文件移动进去。Claude 先列步骤：提取发票日期、识别重复、创建月份目录、移动文件、最后验证。几分钟后，文件真的被整理好了，连图片里的波兰语燃油发票也读出来了。"Cowork 处理的是真实文件和真实工作流。"

这个演示给 PM 的提示很具体：不要只让 Claude 总结文档。让它进入真实工作目录，处理真实文件，按你定义的流程一步步执行。Pawel 还展示了 Gmail connector：Claude 可以看未回复邮件，可以草拟回复，但默认 connector 不会自动发送。Pawel 的设置是让它起草，然后自己确认。每次处理完，Cowork 或 Code 还会复盘他的修改，从反馈里学习下一次怎么写得更像他。Slack 也类似：可以让 Claude 起草答复，再由人点击发送，既省掉查资料时间，也保留最后的人类确认。Pawel 把 MCP 叫作 agent 的 USB，Google Drive、Gmail、Slack、本地服务都可以通过 connector 接进来。

PM 迟早要学 Claude Code。Aakash 替很多非技术 PM 问了一个问题：Code 看起来吓人，IDE 也吓人，能不能跳过？Pawel 的答案很直接：不能。Cowork 可以做大量个人生产力任务，分析信息、整理文件、组织知识库都没问题，但 Claude Code 面向代码库，有 explorer view、hooks、可定义的 subagents、本地命令和更完整的工程插件。PM 和工程师一起工作，迟早会接触代码库。"作为一个和工程师一起工作的产品经理，你终究必须和代码打交道。"

Pawel 建议先从 Cowork 学会和 agent 合作：怎么组织知识，怎么定义流程，怎么给反馈。等系统长到几十个文件，或者开始涉及前端、数据库、debug、release notes、代码审查，再进入 Code。Aakash 说得更重：PM 应该学 Claude Code，要先跨过“这个界面不好看”的心理门槛。Pawel 自己会在同一个 repo 里同时使用 Cowork 和 Claude Code，Cowork 负责更友好的文件体验，Code 负责更强的工程能力，两边读的是同一套 CLAUDE.md 和项目文件。Code 里还可以定义固定 subagents，比如 researcher、tester、release notes writer；Cowork 可以动态分派，但没有同样的工程化角色结构。

Skills 是最高 ROI 的投资。Pawel 反复强调 Skills。发票演示里，Cowork 会根据任务动态加载 PDF skill。它先看 skill 的名字和描述，判断是否匹配当前任务，再读取详细步骤。Anthropic 把这种机制叫 progressive disclosure：你可以有几十个、上百个 skills，但 Claude 不会一开始把所有说明塞进上下文。只有任务真的需要时，它才读完整流程。"Skills 会根据当前任务被激活；Claude 只有在描述匹配时，才读取详细说明。"

Pawel 的 PM skills marketplace 就是围绕这个思路做的。他建议先用 marketplace 里的基线 skill，再用真实反馈迭代 5 到 6 轮，让 Claude 根据错误从第一性原理重写流程。产品经理过去收集一堆 prompt，放在 Notion 或文档里，下次继续复制粘贴。Pawel 要的是另一套东西：每次执行后，系统都把反馈写回规则里，下一轮自动变好。他自己的内容工作也这么跑：研究、文案、infographic、HTML 生成、PNG 导出，都可以被拆成可复用的 procedures。Aakash 提到，Product Compass 的 infographic 很多就是在 Claude Code 里生成 HTML、调用组件库、通过对话迭代，再导出成 PNG。PM skills repo 72 小时拿到 1300 个 star，后来到 1 万 star，正说明 PM 也在寻找可复用的工作协议。

知识库要能自我改进。Aakash 问 PM 设置 Claude 最大的错误是什么。Pawel 没有说模型选错，也没有说提示词太短。他说最大的错误是每次都从零开始 prompt。因为 PM 的工作数据太多，全部放在脑子里不可行。Pawel 会把知识分成三类：已经确认、默认执行的 rules；带证据、需要继续观察的 hypotheses；被否定过、避免下次再试的 rejected patterns。"最大的错误，是每次都从零开始提示它，没有让系统从错误中学习。"

他的三行自我改进提示词也很朴素：开始前先 review rules；执行时应用 confirmed rules；收到反馈后更新知识。测试、营销、产品战略都可以这么做。Pawel 还提到 CLAUDE.md 的角色：它不该塞满全部领域知识，而应负责路由，告诉 agent 去哪里读项目结构、规则、假设和历史反馈。PM 的复利不在 prompt 收藏夹里，而在一套会吸收反馈的工作系统里。当同一个项目既能在 Cowork 打开，也能在 Code web session 打开，还能从手机 Dispatch 任务，知识组织就变成系统底座。Pawel 用同一个 editor 项目承载假设、sound bites、hooks 和私有 GitHub 文件，避免每个界面各存一份孤立上下文。他从 2026 年 2 月开始给 agent 喂社交媒体截图和文章，让系统判断某条帖子为什么有效，把跨平台共性沉淀成 rules，把不确定判断先放进 hypotheses，再用更多数据确认或否定。

Dispatch 把工作搬到手机上。后半段两人聊到远程工作。Anthropic 近期有 web sessions、remote control、Dispatch、channels 等多个界面，Pawel 说自己测试过 channels，但没有长期使用。Dispatch 更像一个 walkie-talkie：一个聊天入口，可以启动多个后台任务。比如让一个任务做 Anthropic 风格 infographic，让另一个任务检查最近两小时邮件数量，再让第三个任务分析 Aakash 的帖子。任务完成后分别回报状态。"Dispatch 可以从一个界面启动多个后台任务，每个任务完成后都会报告状态。"

Pawel 说自己会在购物、陪孩子的时候派发任务，十分钟后看结果，再给下一轮文字反馈。复杂工作会切到 code web sessions，因为它更像云端 Visual Studio Code，可以连接 GitHub 里的项目，即使本地电脑不在线也能继续。Aakash 总结得很形象：你在散步、开会、参加活动时，agents 也能为你跑着。Pawel 还推荐 Vercel 的 Agent Browser：Chrome MCP 会频繁截图，复杂任务可能烧掉大量 token；Agent Browser 用 headless 浏览器把页面结构给 agent，适合 LinkedIn、老 CRM、SAP 这类没有顺手 API 的系统。他说 Dispatch 的限制也存在：手机上是一条长消息流，没有 tabs，线程太多时会乱；更复杂的项目还是要切到 web sessions 管理。

生产自动化还要硬规则。最后 Aakash 问了一个容易被忽略的问题：n8n 还重要吗？是不是所有事都应该交给 Claude Code？Pawel 的回答是：个人自动化和生产自动化要分开。分析 100 条推文、起草客户邮件、做个人知识库，可以用 Claude Code。代码库里的 release notes、code review、前端设计，也可以让 agent 和 subagents 做。但客户工单、权限、隐私、重试、数据访问这些生产流程，不能只靠文本说明。"在生产环境里，凡是不需要自主的部分，就不该交给自主 agent。"

Pawel 举了几个硬边界：如果 Anthropic API 失败，要重试三次；发邮件前必须验证客户邮箱存在；客户不能访问另一个客户的数据；1GB 文件不能被随便复制；某些数据 agent 甚至不该看。这些规则应该写进代码、条件和 guardrails。个人工作流可以靠 agent 探索，生产流程需要把能确定的步骤固化下来。他把 agent 分成三种形态：大部分流程由代码控制，中间只有一次 LLM 调用；代码和 agent 混合；完全自主。越接近生产，越要把可确定的环节收回到代码里。Pawel 说，非程序员最简单的路径仍然可以从 n8n 这类工具起步；会写代码的团队，则可以用 Anthropic API 或其他 agent API，把流程规则直接编码进系统。

写在最后。Pawel 这期最适合 PM 立刻拿去做一件事：停止收藏 prompt，开始沉淀 workflow。先选一个高频任务，写清规则、输入、输出、反馈记录，让 Claude 下次从已有经验出发。等 Cowork 跑顺，再把项目放进 GitHub，用 Claude Code 和 Dispatch 接上真实工作。未来一年，PM 不一定更轻松，但会少写很多低价值材料，把时间花在判断、调度、验证和取舍上。能把 Claude 接进真实文件、代码库和业务系统的人，会先一步拥有新的工作杠杆，也会更早看见自己的判断边界，知道哪些事交给机器，哪些事自己拍板并承担后果。`;

const state = {
  view: "home",
  tab: "home",
  input: "",
  modal: null,
  isGenerating: false,
  reviewedCount: 35,
  chapters: [],
  currentChapterId: "",
  notifications: [],
  chapter: null,
  reviewSession: null,
  currentQuestionIndex: 0,
  selectedOptionId: null,
  answerState: "idle",
  revealedCorrectOptionId: null,
  pendingExplanationTimer: null,
  answeredKnowledgePointIds: [],
  reinforcementQueue: [],
  removedQuestionIds: [],
  downgradedQuestionIds: [],
  feedbackRecords: [],
  sourceReturnView: "chapter",
  feedbackSheet: false,
  feedbackSubmitted: false,
  feedbackResolution: "",
  feedbackMessage: "",
  generationErrorTitle: "",
  generationError: ""
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      state.reviewedCount = Number.isFinite(saved.reviewedCount) ? saved.reviewedCount : state.reviewedCount;
      const savedChapters = Array.isArray(saved.chapters) ? saved.chapters : (saved.chapter ? [saved.chapter] : []);
      state.chapters = savedChapters.map((chapter) => ensureChapterShape(chapter));
      state.notifications = Array.isArray(saved.notifications) ? saved.notifications.map(ensureNotificationShape) : [];
      state.currentChapterId = saved.currentChapterId || state.chapters[0]?.id || "";
      if (!currentChapter() && state.chapters.length) state.currentChapterId = state.chapters[0].id;
      syncCurrentChapterRuntime();
      if (saved.reviewSession && state.chapter && !state.chapter.reviewSession) {
        state.chapter.reviewSession = saved.reviewSession;
      }
      loadChapterRuntimeState(state.chapter);
    }
  } catch (_) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function saveState() {
  persistCurrentChapterRuntimeState();
  const snapshot = {
    reviewedCount: state.reviewedCount,
    chapters: state.chapters,
    currentChapterId: state.currentChapterId,
    notifications: state.notifications
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function createId(prefix) {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ensureChapterShape(chapter = {}) {
  const shaped = normalizeGeneratedChapter(chapter, chapter.sourceText || chapter.source?.rawText || "");
  shaped.id = chapter.id || shaped.id || createId("chapter");
  shaped.createdAt = chapter.createdAt || Date.now();
  shaped.updatedAt = chapter.updatedAt || shaped.createdAt;
  shaped.dismissedFromNotifications = Boolean(chapter.dismissedFromNotifications);
  shaped.reviewSession = chapter.reviewSession || null;
  shaped.removedQuestionIds = Array.isArray(chapter.removedQuestionIds) ? chapter.removedQuestionIds : [];
  shaped.downgradedQuestionIds = Array.isArray(chapter.downgradedQuestionIds) ? chapter.downgradedQuestionIds : [];
  shaped.feedbackRecords = Array.isArray(chapter.feedbackRecords) ? chapter.feedbackRecords : [];
  return shaped;
}

function ensureNotificationShape(notification = {}) {
  return {
    id: notification.id || createId("notification"),
    chapterId: notification.chapterId || "",
    type: notification.type || "generation_completed",
    title: notification.title || "生成完成",
    body: notification.body || "",
    read: Boolean(notification.read),
    dismissed: Boolean(notification.dismissed),
    createdAt: notification.createdAt || Date.now()
  };
}

function currentChapter() {
  return state.chapters.find((chapter) => chapter.id === state.currentChapterId) || null;
}

function syncCurrentChapterRuntime() {
  state.chapter = currentChapter();
  return state.chapter;
}

function setCurrentChapter(chapterId) {
  persistCurrentChapterRuntimeState();
  state.currentChapterId = chapterId || "";
  syncCurrentChapterRuntime();
  loadChapterRuntimeState(state.chapter);
}

function upsertChapter(chapter) {
  const shaped = ensureChapterShape(chapter);
  shaped.updatedAt = Date.now();
  const existingIndex = state.chapters.findIndex((item) => item.id === shaped.id);
  if (existingIndex >= 0) {
    state.chapters.splice(existingIndex, 1, { ...state.chapters[existingIndex], ...shaped });
  } else {
    state.chapters.unshift(shaped);
  }
  state.currentChapterId = shaped.id;
  syncCurrentChapterRuntime();
  loadChapterRuntimeState(state.chapter);
  return state.chapter;
}

function loadChapterRuntimeState(chapter) {
  state.reviewSession = chapter?.reviewSession || null;
  if (state.reviewSession) normalizeReviewSession(state.reviewSession);
  state.currentQuestionIndex = state.reviewSession?.currentQueueIndex || 0;
  state.answeredKnowledgePointIds = state.reviewSession?.answeredPointIds ? [...state.reviewSession.answeredPointIds] : [];
  state.reinforcementQueue = state.reviewSession?.reinforcementQueue ? [...state.reviewSession.reinforcementQueue] : [];
  state.removedQuestionIds = Array.isArray(chapter?.removedQuestionIds) ? [...chapter.removedQuestionIds] : [];
  state.downgradedQuestionIds = Array.isArray(chapter?.downgradedQuestionIds) ? [...chapter.downgradedQuestionIds] : [];
  state.feedbackRecords = Array.isArray(chapter?.feedbackRecords) ? [...chapter.feedbackRecords] : [];
}

function persistCurrentChapterRuntimeState() {
  const chapter = currentChapter();
  if (!chapter) return;
  chapter.reviewSession = state.reviewSession || null;
  chapter.masteredPoints = currentMasteredCount();
  chapter.removedQuestionIds = [...state.removedQuestionIds];
  chapter.downgradedQuestionIds = [...state.downgradedQuestionIds];
  chapter.feedbackRecords = [...state.feedbackRecords];
  chapter.updatedAt = Date.now();
}

function chaptersByRecent() {
  return [...state.chapters].sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt));
}

function timestampValue(time) {
  if (!time) return 0;
  if (typeof time === "number") return time;
  const value = new Date(time).getTime();
  return Number.isFinite(value) ? value : 0;
}

function activeHomeChapter() {
  return chaptersByRecent().find((chapter) => chapter.reviewSession?.status === "active")
    || chaptersByRecent().find((chapter) => chapter.status === "completed" && !chapter.reviewSession?.completedAt)
    || null;
}

function nextReviewableChapter(currentId) {
  return chaptersByRecent().find((chapter) => {
    return chapter.id !== currentId
      && chapter.status === "completed"
      && chapter.questions?.length
      && !chapter.reviewSession?.completedAt;
  });
}

function createGenerationNotification(chapter) {
  if (!chapter?.id || chapter.dismissedFromNotifications) return;
  const failed = isFailedChapter(chapter);
  if (!failed) {
    state.notifications = state.notifications.filter((item) => !(item.chapterId === chapter.id && item.type === "generation_failed"));
  }
  const type = failed ? "generation_failed" : "generation_completed";
  state.notifications = state.notifications.filter((item) => !(item.chapterId === chapter.id && item.type === type));
  state.notifications.unshift(ensureNotificationShape({
    id: createId("notification"),
    chapterId: chapter.id,
    type,
    title: failed ? "生成失败" : "生成完成",
    body: failed ? `${chapter.title} 暂时不能复习，点击查看原因` : `${chapter.title} 已生成，可以开始复习`,
    createdAt: Date.now()
  }));
}

function dismissFailureNotification(chapterId) {
  const chapter = state.chapters.find((item) => item.id === chapterId);
  if (chapter) {
    chapter.dismissedFromNotifications = true;
    chapter.updatedAt = Date.now();
  }
  state.notifications = state.notifications.map((notification) => {
    if (notification.chapterId === chapterId && notification.type === "generation_failed") {
      return { ...notification, dismissed: true, read: true };
    }
    return notification;
  });
}

function dismissNotification(notificationId) {
  const notification = state.notifications.find((item) => item.id === notificationId);
  if (!notification) return;
  notification.read = true;
  notification.dismissed = true;
}

function clearReadNotifications() {
  state.notifications.forEach((notification) => {
    if (notification.read && !notification.dismissed) {
      notification.dismissed = true;
    }
  });
}

function visibleNotifications() {
  return [...state.notifications]
    .filter((notification) => !notification.dismissed)
    .sort((a, b) => timestampValue(b.createdAt) - timestampValue(a.createdAt));
}

function deleteChapter(chapterId) {
  state.chapters = state.chapters.filter((chapter) => chapter.id !== chapterId);
  state.notifications = state.notifications.filter((notification) => notification.chapterId !== chapterId);
  if (state.currentChapterId === chapterId) {
    state.currentChapterId = activeHomeChapter()?.id || chaptersByRecent()[0]?.id || "";
  }
  syncCurrentChapterRuntime();
  loadChapterRuntimeState(state.chapter);
}

function navigate(view, tab = state.tab) {
  state.view = view;
  state.tab = tab;
  state.feedbackSheet = false;
  render();
}

function icon(name) {
  const map = {
    home: "⌂",
    book: "▤",
    bell: "♧",
    user: "◎",
    back: "‹",
    close: "×",
    link: "🔗",
    file: "⇧",
    lock: "▣",
    check: "✓",
    spark: "✦",
    light: "☼",
    warn: "!",
    source: "▥",
    arrow: "→"
  };
  return map[name] || name;
}

function shell(title, content, options = {}) {
  const review = options.review ? " review-phone" : "";
  const topbar = options.review
    ? reviewHeader(options)
    : `<header class="topbar">
        ${options.back ? `<button class="icon-button" data-action="${options.back}">${icon("back")}</button>` : ""}
        <h1>${title}</h1>
        ${options.right || ""}
      </header>`;

  return `<main class="phone${review}">
    ${topbar}
    ${content}
    ${options.nav === false ? "" : bottomNav()}
    ${modalContent()}
    ${state.feedbackSheet ? feedbackSheet() : ""}
  </main>`;
}

function reviewHeader(options = {}) {
  const total = activeReviewQueue().length || state.chapter?.questions.length || 0;
  const current = Math.min((state.reviewSession?.currentQueueIndex ?? state.currentQuestionIndex) + 1, total || 1);
  return `<header class="review-header">
    <button class="icon-button" data-action="${options.close || "chapter"}">${icon("close")}</button>
    <div class="review-title">
      <strong>复习中</strong>
      <span>${current} / ${total}</span>
    </div>
    <div></div>
  </header>`;
}

function bottomNav() {
  const active = state.tab;
  return `<nav class="bottom-nav">
    <button class="tab ${active === "home" ? "active" : ""}" data-action="home"><span class="tab-icon">${icon("home")}</span><span>首页</span></button>
    <button class="tab ${active === "chapters" ? "active" : ""}" data-action="chapters"><span class="tab-icon">${icon("book")}</span><span>章节</span></button>
    <button class="tab add-tab ${active === "add" ? "active" : ""}" data-action="add"><span class="plus">+</span><span>添加</span></button>
    <button class="tab ${active === "notifications" ? "active" : ""}" data-action="notifications"><span class="tab-icon">${icon("bell")}</span><span>通知</span></button>
    <button class="tab ${active === "profile" ? "active" : ""}" data-action="profile"><span class="tab-icon">${icon("user")}</span><span>我的</span></button>
  </nav>`;
}

function submittedModal() {
  return `<div class="modal-scrim">
    <div class="modal">
      <div class="modal-icon">${icon("check")}</div>
      <h2>已提交，正在生成</h2>
      <p>完成后会通知你</p>
      <button class="primary-button" data-action="close-modal">知道了</button>
    </div>
  </div>`;
}

function deleteChapterModal() {
  return `<div class="modal-scrim">
    <div class="modal">
      <div class="modal-icon">${icon("warn")}</div>
      <h2>删除这个章节？</h2>
      <p>删除后，本章节的复习进度、反馈记录和通知都会一起移除。</p>
      <button class="primary-button danger-button" data-action="delete-chapter">删除章节</button>
      <button class="ghost-button" data-action="cancel-delete">取消</button>
    </div>
  </div>`;
}

function modalContent() {
  if (state.modal === "submitted") return submittedModal();
  if (state.modal === "delete-chapter") return deleteChapterModal();
  return "";
}

function renderHome() {
  const chapter = activeHomeChapter();
  if (!chapter) {
    return shell("首页", `<section class="center-stage">
      <h2 class="hint-title">每天捡起一枚知识贝壳</h2>
      <p class="hint-copy">点击底部 + 添加复习内容<br>支持文章/视频链接或粘贴文字</p>
    </section>`, { nav: true });
  }

  if (state.currentChapterId !== chapter.id) setCurrentChapter(chapter.id);
  const failed = isFailedChapter(chapter);
  const processing = isProcessingChapter(chapter);
  const progress = currentMasteredCount();
  const total = currentRequiredPointCount() || 1;
  const percent = Math.round((progress / total) * 100);
  const hasActiveSession = state.reviewSession?.status === "active";
  chapter.completed = !hasActiveSession && !failed && !processing;

  return shell("首页", `<section class="content">
    <div class="center-stage" style="min-height:auto; padding-top:34px;">
      <p class="kicker">已复习知识点</p>
      <h2 class="hero-number">${state.reviewedCount}</h2>
    </div>
    <article class="card chapter-card">
      <span class="pill">${failed ? "生成失败" : processing ? statusText(chapter) : "当前章节"}</span>
      <h3 class="chapter-title">${escapeHtml(chapter.title)}</h3>
      <div class="row">
        <span class="muted">已复习 ${progress}/${total} 个知识点</span>
        <strong>${percent}%</strong>
      </div>
      <div class="progress-track" style="margin-top:10px;"><div class="progress-fill" style="--progress:${percent}%"></div></div>
    </article>
    ${failed || processing
      ? `<button class="primary-button" data-action="chapter">查看章节 ${icon("arrow")}</button>`
      : `<button class="primary-button" data-action="start-review">${chapter.completed ? "开始复习" : "继续复习"} ${icon("arrow")}</button>`}
  </section>`);
}

function renderAdd() {
  return shell("添加知识", `<section class="content">
    <p class="input-intro">在此处粘贴您想学习的内容。</p>
    <article class="card input-card">
      <div class="input-title"><span class="badge">✎</span><span>输入内容</span></div>
      <textarea id="knowledge-input" maxlength="5000" placeholder="粘贴文字 / 文章链接 / 视频链接...">${escapeHtml(state.input)}</textarea>
      <div class="input-footer">
        <div class="round-tools"><span class="mini-round">${icon("link")}</span><span class="mini-round">${icon("file")}</span></div>
        <span class="faint" id="counter">${state.input.length}/5000</span>
      </div>
    </article>
    <button class="primary-button" id="generate-button" data-action="generate" ${state.input.trim().length < 24 ? "disabled" : ""}>开始生成 ${icon("spark")}</button>
    <div class="privacy-chip"><span>${icon("lock")}</span><span>内容仅用于生成复习，不会公开</span></div>
    <button class="ghost-button" data-action="sample">填入示例内容</button>
  </section>`);
}

function renderGenerating() {
  return shell("生成中", `<section class="state-wrap">
    <article class="card loading-card">
      <div class="spinner"></div>
      <h2>正在生成复习内容</h2>
      <p class="muted">正在提取知识点、生成题目和解释...</p>
    </article>
  </section>`, { nav: false });
}

function renderGenerationError() {
  return shell("生成失败", `<section class="state-wrap">
    <article class="card loading-card">
      <div class="modal-icon">${icon("warn")}</div>
      <h2>暂时没能生成题目</h2>
      <p class="muted">${escapeHtml(state.generationError || "请换一段更完整的内容再试。")}</p>
      <button class="primary-button" data-action="add">重新添加</button>
      <button class="ghost-button" data-action="home">回到首页</button>
    </article>
  </section>`, { nav: false });
}

function renderChapters() {
  const chapters = chaptersByRecent();
  if (!chapters.length) {
    return shell("全部章节", `<section class="center-stage">
      <h2 class="hint-title">还没有章节</h2>
      <p class="hint-copy">点击底部 + 添加复习内容<br>支持文章/视频链接或粘贴文字</p>
    </section>`);
  }
  return shell("全部章节", `<section class="content">
    ${chapters.map((c) => `<article class="card chapter-card" data-action="open-chapter" data-chapter-id="${escapeHtml(c.id)}">
      <div class="row"><span class="pill ${isFailedChapter(c) ? "danger" : ""}">${statusText(c)}</span><span class="muted">${relativeTime(c.createdAt)}</span></div>
      <h3 class="chapter-title">${escapeHtml(c.title)}</h3>
      <div class="row muted"><span>${escapeHtml(sourceTypeLabel(c))}</span><span>${c.knowledgePoints.length} 个知识点 · ${c.questions.length} 道题</span></div>
    </article>`).join("")}
  </section>`);
}

function renderNotifications() {
  const notifications = visibleNotifications();
  if (!notifications.length) {
    return shell("通知", `<section class="center-stage"><h2 class="hint-title">暂时没有通知</h2></section>`);
  }
  const hasRead = notifications.some((notification) => notification.read);
  return shell("通知", `<section class="content">
    ${hasRead ? `<div class="notification-toolbar"><button class="ghost-button small-link" data-action="clear-read-notifications">清空已读</button></div>` : ""}
    ${notifications.map((notification) => {
      const chapter = state.chapters.find((item) => item.id === notification.chapterId);
      const failed = notification.type === "generation_failed";
      return `<article class="card chapter-card notification-card ${notification.read ? "read" : "unread"}" data-action="open-notification" data-notification-id="${escapeHtml(notification.id)}">
        <div class="notification-card-top">
          <span class="notification-dot" aria-hidden="true"></span>
          <span class="pill ${failed ? "danger" : ""}">${escapeHtml(notification.title)}</span>
          <button class="notification-remove" data-action="dismiss-notification" data-notification-id="${escapeHtml(notification.id)}" aria-label="移除通知">移除</button>
        </div>
        <h3 class="chapter-title">${escapeHtml(chapter?.title || notification.body)}</h3>
        <p class="muted">${escapeHtml(notification.body)}</p>
      </article>`;
    }).join("")}
  </section>`);
}

function renderProfile() {
  return shell("我的", `<section class="content">
    <article class="card chapter-card">
      <h3 class="chapter-title" style="margin-top:0;">Alex</h3>
      <p class="muted">alex@example.com</p>
    </article>
    <article class="card chapter-card" style="margin-top:16px;">
      <div class="knowledge-item"><span class="num">1</span><strong>通知权限</strong></div>
      <div class="knowledge-item"><span class="num">2</span><strong>隐私说明</strong></div>
      <div class="knowledge-item"><span class="num">3</span><strong>关于拾贝</strong></div>
    </article>
  </section>`);
}

function renderChapterDetail() {
  const c = state.chapter;
  if (!c) return renderChapters();
  const failed = isFailedChapter(c);
  const processing = isProcessingChapter(c);
  return shell("章节详情", `<section class="content">
    <h2 class="detail-title">${escapeHtml(c.title)}</h2>
    <div class="source-line"><span>${icon("source")}</span><span>来源：${escapeHtml(sourceTypeLabel(c))}</span></div>
    ${sourceMetaLine(c)}
    <div class="source-line"><span>${icon("link")}</span><button class="ghost-button" style="width:auto; min-height:auto; padding:0;" data-action="source">${sourceActionLabel(c)}</button></div>
    <p class="muted" style="margin-top:18px;">${c.knowledgePoints.length} 个知识点 · ${c.questions.length} 道题</p>
    <p class="muted">状态：${escapeHtml(statusText(c))}</p>
    ${failed ? failedChapterPanel(c) : ""}
    ${processing ? `<article class="card loading-card compact"><div class="spinner"></div><h2>${escapeHtml(statusText(c))}</h2></article>` : ""}
    ${!failed && !processing ? `<button class="primary-button" data-action="start-review">开始复习</button>` : ""}
    <section class="knowledge-list">
      <div class="section-heading"><span>本章知识点</span></div>
      ${c.knowledgePoints.slice(0, 6).map((p, index) => knowledgeItem(p.title, index)).join("")}
      ${c.knowledgePoints.length > 6 ? `<button class="ghost-button small-link" data-action="knowledge">查看全部 ${c.knowledgePoints.length} 个</button>` : ""}
    </section>
  </section>`, { back: "chapters", right: `<button class="icon-button" data-action="confirm-delete">删除</button>` });
}

function failedChapterPanel(chapter) {
  const hasPoints = chapter.knowledgePoints?.length > 0;
  return `<article class="card failure-card">
    <div class="modal-icon">${icon("warn")}</div>
    <h2>${escapeHtml(statusText(chapter))}</h2>
    <p class="muted">${escapeHtml(chapter.failureReason || "这条内容暂时没能生成复习题。")}</p>
    ${chapter.status === "failed_extract_article" ? `<p class="muted">你可以改为粘贴正文再试一次。</p>` : ""}
    <button class="primary-button" data-action="regenerate">${failureActionLabel(chapter)}</button>
    <button class="ghost-button" data-action="dismiss-failure">不再提示</button>
    ${hasPoints ? `<p class="muted">已提取知识点，可在下方查看。</p>` : ""}
  </article>`;
}

function renderKnowledge() {
  const c = state.chapter;
  return shell("本章知识点", `<section class="content">
    ${c.knowledgePoints.map((p, index) => `<div class="knowledge-item"><span class="num">${index + 1}</span><div><strong>${escapeHtml(p.title)}</strong><p class="muted" style="margin:6px 0 0; line-height:1.5;">${escapeHtml(p.summary)}</p></div></div>`).join("")}
  </section>`, { back: "chapter" });
}

function renderSource() {
  const source = state.chapter?.source || {};
  return shell("来源内容", `<section class="content">
    <article class="card chapter-card">
      <span class="pill">${escapeHtml(sourceTypeLabel(state.chapter))}</span>
      <h3 class="chapter-title">${escapeHtml(source.title || state.chapter?.title || "")}</h3>
      ${source.account ? `<p class="muted">来源：${escapeHtml(source.account)}</p>` : ""}
      ${source.url ? `<p class="muted source-url">${escapeHtml(source.url)}</p><a class="primary-button" href="${escapeHtml(source.url)}" target="_blank" rel="noopener">打开原文链接</a>` : ""}
    </article>
    <article class="card chapter-card source-page">${escapeHtml(state.chapter?.sourceText || "")}</article>
  </section>`, { back: "source-back" });
}

function renderReview() {
  const q = currentQuestion();
  if (!q) return renderSummary();
  const answeredCount = currentMasteredCount();
  const progress = (answeredCount / Math.max(1, currentRequiredPointCount())) * 100;
  const answered = state.answerState !== "idle";
  return shell("", `<section class="review-content">
    <div class="progress-track"><div class="progress-fill" style="--progress:${progress}%"></div></div>
    <article class="card question-card">
      <span class="pill">知识点：${escapeHtml(q.pointTitle)}</span>
      <h2 class="question-stem">${escapeHtml(q.stem)}</h2>
      <div class="options">
        ${q.options.map(option => optionButton(q, option, answered)).join("")}
      </div>
    </article>
    ${answered && state.answerState === "correct-old" ? `<div class="feedback-note"><strong>${icon("light")}</strong><span>${escapeHtml(q.shortExplanation)}</span></div>` : ""}
  </section>
  <footer class="review-footer">
    ${answered && state.answerState === "correct-old"
      ? `<button class="primary-button" data-action="next-question">下一题 ${icon("arrow")}</button>`
      : `<button class="secondary-button" data-action="dont-know">? 不知道</button>`}
  </footer>`, { review: true, nav: false, close: "chapter" });
}

function renderExplanation() {
  const q = currentQuestion();
  return shell("", `<section class="explain-header">
    <div class="answer-badge">${escapeHtml(q.correctOptionId)}</div>
    <p class="muted">正确答案</p>
  </section>
  <section class="explain-stack">
    <article class="card explain-card">
      <h2>${icon("light")} 正确理解</h2>
      <p>${escapeHtml(q.fullExplanation)}</p>
    </article>
    <article class="card explain-card">
      <h2>${icon("warn")} 常见误区</h2>
      <ul>${q.pitfalls.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </article>
    <article class="card explain-card source-card">
      <h2>${icon("source")} 来源片段</h2>
      <div class="source-paragraphs">${formatSourceParagraphs(q.sourceSnippet || q.sourceQuote)}</div>
    </article>
    <nav class="action-links">
      <button class="ghost-button small-link" data-action="source">查看完整来源</button>
      <button class="ghost-button" data-action="feedback">题目有问题</button>
    </nav>
  </section>
  <footer class="review-footer"><button class="primary-button" data-action="next-question">继续复习 ${icon("arrow")}</button></footer>`, { review: true, nav: false, close: "chapter" });
}

function renderSummary() {
  const c = state.chapter;
  const nextChapter = nextReviewableChapter(c?.id);
  return shell("章节总结", `<section class="summary-hero">
    <div class="modal-icon">${icon("check")}</div>
    <p>本章复习完成</p>
  </section>
  <article class="card summary-card">
    <span class="pill">当前章节</span>
    <h3 class="chapter-title">${escapeHtml(c.title)}</h3>
    <div class="source-line">${icon("source")} ${escapeHtml(sourceTypeLabel(c))}</div>
    <button class="ghost-button small-link" style="justify-content:flex-start; padding:0;" data-action="source">${sourceActionLabel(c)}</button>
    <div class="summary-stats">
      <div><strong>${c.knowledgePoints.length}</strong><span class="muted">知识点</span></div>
      <div><strong>${c.questions.length}</strong><span class="muted">题目</span></div>
    </div>
  </article>
  <section class="content" style="padding-top:24px;">
    <div class="section-heading"><span>本章知识点</span></div>
    ${c.knowledgePoints.slice(0, 4).map((p, index) => knowledgeItem(p.title, index)).join("")}
  </section>
  <div class="summary-actions">
    ${nextChapter ? `<button class="primary-button" data-action="continue-next-chapter" data-chapter-id="${escapeHtml(nextChapter.id)}">继续下一章 ${icon("arrow")}</button>` : ""}
    <button class="${nextChapter ? "ghost-button" : "primary-button"}" data-action="chapters">回到章节</button>
  </div>`, { nav: false });
}

function formatSourceParagraphs(value) {
  const paragraphs = String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n{2,}/)
    .map(item => item.trim())
    .filter(Boolean);
  const blocks = paragraphs.length ? paragraphs : [String(value || "").trim()].filter(Boolean);
  return blocks.map(item => `<p>${escapeHtml(item)}</p>`).join("");
}

function feedbackSheet() {
  const done = state.feedbackSubmitted;
  const message = state.feedbackMessage || "已收到";
  return `<div class="modal-scrim" data-action="close-sheet"></div>
    <section class="sheet">
      ${done ? `<div class="modal-icon">${icon("check")}</div><h2>已收到</h2><p class="muted" style="text-align:center;">${escapeHtml(message)}</p><button class="primary-button" data-action="close-sheet">继续复习</button>`
        : `<h2>这道题哪里有问题？</h2>
          ${feedbackOptions().map(option => `<button class="sheet-option" data-action="submit-feedback" data-feedback-type="${option.type}"><span>${option.label}</span><span>${icon("arrow")}</span></button>`).join("")}
          <button class="ghost-button" data-action="close-sheet">取消</button>`}
    </section>`;
}

function feedbackOptions() {
  return [
    { type: "wrong_answer", label: "答案不准" },
    { type: "unclear", label: "题目看不懂" },
    { type: "unrelated_source", label: "和来源无关" },
    { type: "too_easy", label: "太简单" }
  ];
}

function knowledgeItem(title, index) {
  return `<div class="knowledge-item"><span class="num">${index + 1}</span><strong>${escapeHtml(title)}</strong></div>`;
}

function relativeTime(time) {
  if (!time) return "";
  const timestamp = typeof time === "number" ? time : new Date(time).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  return `${Math.floor(diff / day)} 天前`;
}

function sourceTypeLabel(chapter) {
  const type = chapter?.source?.type || chapter?.sourceType || "text";
  if (type === "article_link") {
    const host = safeHostname(chapter?.source?.url);
    return host === "mp.weixin.qq.com" ? "公众号文章" : "网页文章";
  }
  return "粘贴文字";
}

function isFailedChapter(chapter) {
  return Boolean(chapter?.status && String(chapter.status).startsWith("failed_"));
}

function isProcessingChapter(chapter) {
  return [
    "submitted",
    "extracting_content",
    "generating_points",
    "generating_questions",
    "quality_checking",
    "auto_regenerating_questions"
  ].includes(chapter?.status);
}

function statusText(chapter) {
  const map = {
    submitted: "已提交",
    extracting_content: "正在提取正文",
    generating_points: "正在生成知识点",
    generating_questions: "正在生成题目",
    quality_checking: "正在检查题目质量",
    auto_regenerating_questions: "正在检查题目质量",
    completed: "已生成",
    failed_extract_article: "文章正文提取失败",
    failed_extract_video: "视频文本提取失败",
    failed_points: "知识点生成失败",
    failed_questions: "题目生成失败",
    failed_no_qualified_questions: "生成失败"
  };
  return chapter?.displayStatusText || map[chapter?.status] || "已生成";
}

function failureActionLabel(chapter) {
  if (chapter?.status === "failed_extract_article" || chapter?.status === "failed_extract_video" || chapter?.status === "failed_points") {
    return "重试";
  }
  return "重新生成";
}

function sourceMetaLine(chapter) {
  const source = chapter?.source || {};
  const meta = source.account || safeHostname(source.url);
  if (!meta) return "";
  return `<div class="source-line"><span>${icon("source")}</span><span>${escapeHtml(meta)}</span></div>`;
}

function sourceActionLabel(chapter) {
  return chapter?.source?.url ? "查看提取正文和原链接" : "查看输入内容";
}

function safeHostname(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function optionButton(q, option, answered) {
  let cls = "";
  let key = option.id;
  if (answered && option.id === state.revealedCorrectOptionId) {
    cls = " correct";
    key = icon("check");
  } else if (answered && option.id === state.selectedOptionId && option.id !== q.correctOptionId) {
    cls = " wrong";
  }
  return `<button class="option${cls}" data-action="answer" data-option="${option.id}" ${answered ? "disabled" : ""}>
    <span class="option-inner"><span class="option-key">${key}</span><span>${escapeHtml(option.text)}</span></span>
  </button>`;
}

function currentQuestion() {
  const item = currentQueueItem();
  if (!item) return undefined;
  return questionById(item.questionId);
}

function currentQueueItem() {
  const session = state.reviewSession;
  if (!session || session.status !== "active") return null;
  const queue = activeReviewQueue();
  return queue[session.currentQueueIndex] || null;
}

function activeReviewQueue() {
  return state.reviewSession?.queue || [];
}

function generateChapter(text) {
  const sentences = splitSentences(text);
  const title = createTitle(sentences[0] || text);
  const points = createKnowledgePoints(sentences);
  const questions = points.map((point, index) => createQuestion(point, points, index));
  return {
    id: createId("chapter"),
    title,
    status: "completed",
    sourceType: "text",
    sourceText: text,
    source: { type: "text", title, rawText: text, cleanedText: text },
    knowledgePoints: points,
    questions,
    masteredPoints: 0,
    completed: true,
    createdAt: Date.now()
  };
}

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[。！？!?；;])\s*/)
    .map(item => item.trim())
    .filter(item => item.length > 12)
    .slice(0, 10);
}

function createTitle(firstSentence) {
  const clean = firstSentence.replace(/[。！？!?；;]/g, "").trim();
  if (clean.length <= 22) return clean || "新添加的知识";
  return clean.slice(0, 22) + "...";
}

function createKnowledgePoints(sentences) {
  const usable = sentences.length ? sentences : splitSentences(sampleText);
  const selected = usable.slice(0, Math.min(Math.max(usable.length, 3), 8));
  return selected.map((sentence, index) => {
    const topic = extractTopic(sentence, index);
    return {
      id: `kp-${index + 1}`,
      title: topic,
      summary: sentence.length > 68 ? sentence.slice(0, 68) + "..." : sentence,
      sourceQuote: sentence
    };
  });
}

function extractTopic(sentence, index) {
  const cleaned = sentence.replace(/[“”"'.，。！？、：:；;（）()]/g, " ");
  const words = cleaned.split(/\s+/).filter(Boolean);
  const chineseChunks = cleaned.match(/[\u4e00-\u9fa5A-Za-z0-9]{2,12}/g) || [];
  const preferred = chineseChunks.find(chunk => /AI|Agent|知识|题目|任务|工具|复习|用户|内容|产品|模型|自动化|流程/.test(chunk));
  if (preferred) return preferred.length > 14 ? preferred.slice(0, 14) : preferred;
  return (words[0] || chineseChunks[0] || `知识点 ${index + 1}`).slice(0, 14);
}

function createQuestion(point, allPoints, index) {
  const correct = "B";
  const distractorA = allPoints[(index + 1) % allPoints.length]?.title || "另一个概念";
  const distractorC = allPoints[(index + 2) % allPoints.length]?.title || "无关概念";
  const distractorD = allPoints[(index + 3) % allPoints.length]?.title || "工具选择";
  return {
    id: `q-${index + 1}`,
    pointId: point.id,
    pointTitle: point.title,
    stem: `下面哪种理解最符合这段内容提到的“${point.title}”？`,
    options: [
      { id: "A", text: `只关注“${distractorA}”，不需要结合上下文判断` },
      { id: "B", text: point.summary },
      { id: "C", text: `把“${distractorC}”理解成唯一目标，忽略原文限制` },
      { id: "D", text: `频繁更换工具或方法，而不是先明确任务边界` }
    ],
    correctOptionId: correct,
    shortExplanation: `正确：这道题考察的是“${point.title}”的核心判断，而不是只记住原文词语。`,
    fullExplanation: `这段内容的重点是：${point.summary}。复习时要抓住它背后的判断条件、适用场景和边界，而不是只背下某个关键词。`,
    pitfalls: [
      "容易只记住关键词，却忽略它在原文里的判断条件。",
      "容易把原文中的局部说法扩大成绝对结论。"
    ],
    sourceQuote: point.sourceQuote,
    isNew: index === 0
  };
}

function answer(optionId) {
  if (state.pendingExplanationTimer) return;
  const q = currentQuestion();
  if (!q) return;
  const pointId = q.knowledgePointId || q.pointId;
  state.selectedOptionId = optionId;
  state.revealedCorrectOptionId = q.correctOptionId;
  const isCorrect = optionId === q.correctOptionId;
  const attempt = recordAttempt(isCorrect ? "correct" : "wrong");

  if (isCorrect && attempt.isReinforcement) {
    state.answerState = "correct-old";
    saveState();
    render();
    return;
  }
  state.answerState = isCorrect ? "correct-new" : "wrong";
  saveState();
  render();
  scheduleExplanation();
}

function nextQuestion() {
  clearPendingExplanationTimer();
  state.selectedOptionId = null;
  state.revealedCorrectOptionId = null;
  state.answerState = "idle";
  state.feedbackSubmitted = false;
  state.feedbackResolution = "";
  state.feedbackMessage = "";
  const session = state.reviewSession;
  if (!session) return navigate("chapter");

  const nextIndex = nextAvailableQueueIndex(session.currentQueueIndex + 1);
  if (nextIndex !== null) {
    session.currentQueueIndex = nextIndex;
    state.currentQuestionIndex = nextIndex;
    navigate("review");
  } else if (isSessionComplete()) {
    session.status = "completed";
    session.completedAt = Date.now();
    state.reviewedCount += currentRequiredPointCount();
    state.chapter.masteredPoints = currentMasteredCount();
    saveState();
    navigate("summary");
  } else {
    const fallbackIndex = appendPendingReinforcementOrNextPoint();
    if (fallbackIndex === null) {
      session.status = "completed";
      session.completedAt = Date.now();
      state.reviewedCount += currentRequiredPointCount();
      saveState();
      navigate("summary");
      return;
    }
    session.currentQueueIndex = fallbackIndex;
    state.currentQuestionIndex = fallbackIndex;
    saveState();
    navigate("review");
  }
}

function nextAvailableQueueIndex(startIndex) {
  const queue = activeReviewQueue();
  for (let index = startIndex; index < queue.length; index += 1) {
    const item = queue[index];
    if (isQueueItemAvailable(item)) {
      return index;
    }
  }
  return null;
}

function bindEvents() {
  document.body.addEventListener("click", event => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "home") return navigate("home", "home");
    if (action === "chapters") return navigate("chapters", "chapters");
    if (action === "add") return navigate("add", "add");
    if (action === "notifications") return navigate("notifications", "notifications");
    if (action === "profile") return navigate("profile", "profile");
    if (action === "chapter") return navigate("chapter", "chapters");
    if (action === "open-chapter") {
      setCurrentChapter(target.dataset.chapterId);
      return navigate("chapter", "chapters");
    }
    if (action === "open-notification") {
      const notification = state.notifications.find((item) => item.id === target.dataset.notificationId);
      if (!notification) return;
      notification.read = true;
      if (notification.type === "generation_completed") {
        notification.dismissed = true;
      }
      setCurrentChapter(notification.chapterId);
      saveState();
      return navigate("chapter", "chapters");
    }
    if (action === "dismiss-notification") {
      dismissNotification(target.dataset.notificationId);
      saveState();
      return render();
    }
    if (action === "clear-read-notifications") {
      clearReadNotifications();
      saveState();
      return render();
    }
    if (action === "knowledge") return navigate("knowledge", "chapters");
    if (action === "source") {
      state.sourceReturnView = state.view;
      return navigate("source", state.tab);
    }
    if (action === "source-back") return navigate(state.sourceReturnView || "chapter", state.tab);
    if (action === "close-modal") {
      state.modal = null;
      return render();
    }
    if (action === "confirm-delete") {
      state.modal = "delete-chapter";
      return render();
    }
    if (action === "cancel-delete") {
      state.modal = null;
      return render();
    }
    if (action === "delete-chapter") {
      const chapterId = state.currentChapterId;
      state.modal = null;
      deleteChapter(chapterId);
      saveState();
      return navigate("chapters", "chapters");
    }
    if (action === "sample") {
      state.input = sampleText;
      return render();
    }
    if (action === "generate") return startGenerate();
    if (action === "start-review") {
      const homeChapter = state.view === "home" ? activeHomeChapter() : state.chapter;
      if (homeChapter && state.currentChapterId !== homeChapter.id) setCurrentChapter(homeChapter.id);
      if (isFailedChapter(state.chapter) || isProcessingChapter(state.chapter)) return navigate("chapter", "chapters");
      if (!state.reviewSession || state.reviewSession.status !== "active") {
        state.reviewSession = createReviewSession(state.chapter);
        state.chapter.reviewSession = state.reviewSession;
      }
      normalizeReviewSession(state.reviewSession);
      state.currentQuestionIndex = state.reviewSession.currentQueueIndex || 0;
      state.selectedOptionId = null;
      state.revealedCorrectOptionId = null;
      state.answerState = "idle";
      saveState();
      return navigate("review");
    }
    if (action === "regenerate") return startRegenerate();
    if (action === "dismiss-failure") {
      dismissFailureNotification(state.currentChapterId);
      saveState();
      state.tab = "chapters";
      return navigate("chapters", "chapters");
    }
    if (action === "continue-next-chapter") {
      setCurrentChapter(target.dataset.chapterId);
      if (!state.reviewSession || state.reviewSession.status !== "active") {
        state.reviewSession = createReviewSession(state.chapter);
        state.chapter.reviewSession = state.reviewSession;
      }
      saveState();
      return navigate("review", "chapters");
    }
    if (action === "answer") return answer(target.dataset.option);
    if (action === "dont-know") {
      if (state.pendingExplanationTimer) return;
      const q = currentQuestion();
      if (!q) return;
      state.selectedOptionId = null;
      state.revealedCorrectOptionId = q?.correctOptionId || null;
      state.answerState = "wrong";
      recordAttempt("unknown");
      saveState();
      render();
      return scheduleExplanation();
    }
    if (action === "next-question") return nextQuestion();
    if (action === "feedback") {
      state.feedbackSheet = true;
      state.feedbackSubmitted = false;
      state.feedbackResolution = "";
      state.feedbackMessage = "";
      return render();
    }
    if (action === "submit-feedback") {
      submitFeedback(target.dataset.feedbackType);
      return render();
    }
    if (action === "close-sheet") {
      state.feedbackSheet = false;
      const shouldAdvance = state.feedbackSubmitted && state.feedbackResolution === "removed";
      state.feedbackSubmitted = false;
      state.feedbackResolution = "";
      state.feedbackMessage = "";
      if (shouldAdvance) return nextQuestion();
      return render();
    }
  });

  document.body.addEventListener("input", event => {
    if (event.target.id === "knowledge-input") {
      state.input = event.target.value;
      const counter = document.getElementById("counter");
      const button = document.getElementById("generate-button");
      if (counter) counter.textContent = `${state.input.length}/5000`;
      if (button) button.disabled = state.input.trim().length < 24;
    }
  });
}

function scheduleExplanation() {
  clearPendingExplanationTimer();
  state.pendingExplanationTimer = window.setTimeout(() => {
    state.pendingExplanationTimer = null;
    navigate("explanation");
  }, 650);
}

function clearPendingExplanationTimer() {
  if (state.pendingExplanationTimer) {
    window.clearTimeout(state.pendingExplanationTimer);
    state.pendingExplanationTimer = null;
  }
}

function enqueueCurrentForReinforcement() {
  if (!state.reinforcementQueue.includes(state.currentQuestionIndex)) {
    state.reinforcementQueue.push(state.currentQuestionIndex);
  }
}

function removeCurrentFromReinforcement() {
  state.reinforcementQueue = state.reinforcementQueue.filter((index) => index !== state.currentQuestionIndex);
}

function createReviewSession(chapter) {
  const masteryByPointId = {};
  for (const point of chapter.knowledgePoints) {
    masteryByPointId[point.id] = point.masteryScore ?? INITIAL_MASTERY_SCORE;
  }

  const points = [...chapter.knowledgePoints].sort(compareSourceOrder);

  return normalizeReviewSession({
    id: `session-${Date.now()}`,
    chapterId: chapter.id || chapter.createdAt || "current-chapter",
    status: "active",
    queue: points.map((point, index) => {
      const question = pickQuestionForPoint(point.id);
      return {
        id: `queue-${index + 1}`,
        pointId: point.id,
        questionId: question?.id || "",
        isReinforcement: false
      };
    }).filter((item) => item.questionId),
    reinforcementQueue: [],
    currentQueueIndex: 0,
    attempts: [],
    masteryByPointId,
    answeredPointIds: [],
    masteredThisRoundPointIds: [],
    skippedPointIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completedAt: null
  });
}

function normalizeReviewSession(session) {
  session.queue = Array.isArray(session.queue) ? session.queue : [];
  session.reinforcementQueue = Array.isArray(session.reinforcementQueue) ? session.reinforcementQueue : [];
  session.currentQueueIndex = Number.isFinite(session.currentQueueIndex) ? session.currentQueueIndex : 0;
  session.attempts = Array.isArray(session.attempts) ? session.attempts : [];
  session.masteryByPointId = session.masteryByPointId || {};
  session.answeredPointIds = Array.isArray(session.answeredPointIds) ? session.answeredPointIds : [];
  session.masteredThisRoundPointIds = Array.isArray(session.masteredThisRoundPointIds) ? session.masteredThisRoundPointIds : [];
  session.skippedPointIds = Array.isArray(session.skippedPointIds) ? session.skippedPointIds : [];
  for (const point of state.chapter?.knowledgePoints || []) {
    if (!Number.isFinite(session.masteryByPointId[point.id])) {
      session.masteryByPointId[point.id] = point.masteryScore ?? INITIAL_MASTERY_SCORE;
    }
  }
  return session;
}

function recordAttempt(result) {
  const session = state.reviewSession || (state.reviewSession = createReviewSession(state.chapter));
  const item = currentQueueItem();
  const question = currentQuestion();
  const pointId = item?.pointId || question?.knowledgePointId || question?.pointId;
  const scoreBefore = session.masteryByPointId[pointId] ?? INITIAL_MASTERY_SCORE;
  const isReinforcement = Boolean(item?.isReinforcement);
  const delta = scoreDelta(result, isReinforcement);
  const scoreAfter = clampMastery(scoreBefore + delta);
  const attempt = {
    id: `attempt-${Date.now()}-${session.attempts.length + 1}`,
    reviewSessionId: session.id,
    chapterId: session.chapterId,
    knowledgePointId: pointId,
    questionId: question?.id || item?.questionId || "",
    answer: state.selectedOptionId || "",
    result,
    isReinforcement,
    mastery_score_before: scoreBefore,
    mastery_score_after: scoreAfter,
    invalidated_by_feedback: false,
    skipped_due_to_question_feedback: false,
    answered_at: Date.now()
  };

  session.attempts.push(attempt);
  session.masteryByPointId[pointId] = scoreAfter;
  addUnique(session.answeredPointIds, pointId);
  state.answeredKnowledgePointIds = [...session.answeredPointIds];

  if (result === "correct") {
    addUnique(session.masteredThisRoundPointIds, pointId);
    session.reinforcementQueue = session.reinforcementQueue.filter((id) => id !== pointId);
  } else {
    session.masteredThisRoundPointIds = session.masteredThisRoundPointIds.filter((id) => id !== pointId);
    scheduleReinforcement(pointId);
  }

  session.updatedAt = Date.now();
  state.chapter.masteredPoints = currentMasteredCount();
  return attempt;
}

function scoreDelta(result, isReinforcement) {
  if (result === "correct") return isReinforcement ? 10 : 15;
  return isReinforcement ? -15 : -20;
}

function scheduleReinforcement(pointId) {
  const session = state.reviewSession;
  const currentItem = currentQueueItem();
  addUnique(session.reinforcementQueue, pointId);
  removeFutureReinforcementForPoint(pointId);
  const question = pickQuestionForPoint(pointId, currentItem?.questionId);
  if (!question) return;

  const item = {
    id: `reinforce-${Date.now()}-${session.queue.length + 1}`,
    pointId,
    questionId: question.id,
    isReinforcement: true
  };
  const insertIndex = reinforcementInsertIndex(pointId);
  session.queue.splice(insertIndex, 0, item);
}

function reinforcementInsertIndex(pointId) {
  const session = state.reviewSession;
  let seenOtherQuestions = 0;
  for (let index = session.currentQueueIndex + 1; index < session.queue.length; index += 1) {
    const item = session.queue[index];
    if (!isQueueItemAvailable(item) || item.pointId === pointId) continue;
    seenOtherQuestions += 1;
    if (seenOtherQuestions >= REINFORCEMENT_GAP) return index + 1;
  }
  return session.queue.length;
}

function appendPendingReinforcementOrNextPoint() {
  const session = state.reviewSession;
  const pendingPointId = session.reinforcementQueue.find((pointId) => !session.masteredThisRoundPointIds.includes(pointId));
  if (pendingPointId) {
    const question = pickQuestionForPoint(pendingPointId, currentQuestion()?.id);
    if (!question) {
      addUnique(session.skippedPointIds, pendingPointId);
      session.reinforcementQueue = session.reinforcementQueue.filter((id) => id !== pendingPointId);
      return nextAvailableQueueIndex(session.currentQueueIndex + 1);
    }
    session.queue.push({
      id: `reinforce-tail-${Date.now()}-${session.queue.length + 1}`,
      pointId: pendingPointId,
      questionId: question.id,
      isReinforcement: true
    });
    return session.queue.length - 1;
  }
  const pendingRequiredPointId = requiredPointIdsForSession().find((pointId) => {
    return !session.answeredPointIds.includes(pointId) || !session.masteredThisRoundPointIds.includes(pointId);
  });
  if (pendingRequiredPointId) {
    const question = pickQuestionForPoint(pendingRequiredPointId, currentQuestion()?.id);
    if (question) {
      session.queue.push({
        id: `pending-${Date.now()}-${session.queue.length + 1}`,
        pointId: pendingRequiredPointId,
        questionId: question.id,
        isReinforcement: session.answeredPointIds.includes(pendingRequiredPointId)
      });
      return session.queue.length - 1;
    }
    addUnique(session.skippedPointIds, pendingRequiredPointId);
  }
  return nextAvailableQueueIndex(session.currentQueueIndex + 1);
}

function pickQuestionForPoint(pointId, excludeQuestionId = "") {
  const candidates = (state.chapter?.questions || []).filter((question) => {
    const questionPointId = question.knowledgePointId || question.pointId;
    return questionPointId === pointId && !state.removedQuestionIds.includes(question.id);
  });
  if (!candidates.length) return null;
  const alternative = candidates.find((question) => question.id !== excludeQuestionId);
  return alternative || candidates[0];
}

function questionById(questionId) {
  return (state.chapter?.questions || []).find((question) => question.id === questionId);
}

function isQueueItemAvailable(item) {
  if (!item || state.reviewSession?.skippedPointIds.includes(item.pointId)) return false;
  const question = questionById(item.questionId);
  return Boolean(question && !state.removedQuestionIds.includes(question.id));
}

function isSessionComplete() {
  const session = state.reviewSession;
  if (!session) return false;
  const requiredPointIds = requiredPointIdsForSession();
  return requiredPointIds.every((pointId) => session.answeredPointIds.includes(pointId))
    && requiredPointIds.every((pointId) => session.masteredThisRoundPointIds.includes(pointId))
    && session.reinforcementQueue.length === 0;
}

function requiredPointIdsForSession() {
  const skipped = new Set(state.reviewSession?.skippedPointIds || []);
  return (state.chapter?.knowledgePoints || [])
    .map((point) => point.id)
    .filter((pointId) => !skipped.has(pointId));
}

function currentMasteredCount() {
  const session = state.reviewSession;
  if (!session) return state.chapter?.masteredPoints || 0;
  return requiredPointIdsForSession().filter((pointId) => session.masteredThisRoundPointIds.includes(pointId)).length;
}

function currentRequiredPointCount() {
  return requiredPointIdsForSession().length || state.chapter?.knowledgePoints.length || 0;
}

function removeFutureReinforcementForPoint(pointId) {
  const session = state.reviewSession;
  session.queue = session.queue.filter((item, index) => {
    if (index <= session.currentQueueIndex) return true;
    return !(item.isReinforcement && item.pointId === pointId);
  });
}

function hasPointEverBeenAnswered(pointId) {
  return state.reviewSession?.attempts?.some((attempt) => attempt.knowledgePointId === pointId) || false;
}

function latestValidAttemptForQuestion(questionId) {
  const attempts = state.reviewSession?.attempts || [];
  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    const attempt = attempts[index];
    if (attempt.questionId === questionId && !attempt.invalidated_by_feedback) return attempt;
  }
  return null;
}

function addUnique(list, value) {
  if (value && !list.includes(value)) list.push(value);
}

function clampMastery(value) {
  return Math.min(100, Math.max(0, value));
}

function submitFeedback(type) {
  const q = currentQuestion();
  if (!q) return;
  const pointId = q.knowledgePointId || q.pointId;
  const severe = isSevereFeedback(type);
  const latestAttempt = latestValidAttemptForQuestion(q.id);

  if (severe) {
    if (!state.removedQuestionIds.includes(q.id)) {
      state.removedQuestionIds.push(q.id);
    }
    invalidateLatestAttempt(q.id);
    removeQuestionFromSession(q.id, pointId);
    state.feedbackResolution = "removed";
    state.feedbackMessage = "已收到，这道题已从本次复习移除";
  } else {
    if (!state.downgradedQuestionIds.includes(q.id)) {
      state.downgradedQuestionIds.push(q.id);
    }
    state.feedbackResolution = "downgraded";
    state.feedbackMessage = "已收到，后续会减少出现";
  }

  state.feedbackRecords.push({
    id: `feedback-${Date.now()}-${state.feedbackRecords.length + 1}`,
    questionId: q.id,
    knowledgePointId: pointId,
    type,
    severe,
    invalidatedAttemptId: severe ? latestAttempt?.id || "" : "",
    resolution: state.feedbackResolution,
    createdAt: Date.now()
  });
  state.feedbackSubmitted = true;
  saveState();
}

function isSevereFeedback(type) {
  return type === "wrong_answer" || type === "unclear" || type === "unrelated_source";
}

function invalidateLatestAttempt(questionId) {
  const session = state.reviewSession;
  const attempt = latestValidAttemptForQuestion(questionId);
  if (!session || !attempt) return;
  attempt.invalidated_by_feedback = true;
  attempt.skipped_due_to_question_feedback = true;
  session.masteryByPointId[attempt.knowledgePointId] = attempt.mastery_score_before;
}

function removeQuestionFromSession(questionId, pointId) {
  const session = state.reviewSession;
  if (!session) return;
  session.queue = session.queue.filter((item, index) => {
    if (index === session.currentQueueIndex) return true;
    return item.questionId !== questionId;
  });
  session.reinforcementQueue = session.reinforcementQueue.filter((id) => id !== pointId);

  const stillHasQuestion = Boolean(pickQuestionForPoint(pointId));
  if (!stillHasQuestion) {
    addUnique(session.skippedPointIds, pointId);
    session.answeredPointIds = session.answeredPointIds.filter((id) => id !== pointId);
    session.masteredThisRoundPointIds = session.masteredThisRoundPointIds.filter((id) => id !== pointId);
  }
  state.answeredKnowledgePointIds = [...session.answeredPointIds];
  state.chapter.masteredPoints = currentMasteredCount();
  session.updatedAt = Date.now();
}

function startGenerate() {
  const text = state.input.trim();
  if (text.length < 24) return;
  state.view = "generating";
  state.tab = "add";
  state.generationErrorTitle = "";
  state.generationError = "";
  render();
  requestGeneration(text)
    .then((chapter) => {
      const savedChapter = upsertChapter(chapter);
      state.reviewSession = null;
      state.currentQuestionIndex = 0;
      state.answeredKnowledgePointIds = [];
      state.reinforcementQueue = [];
      state.removedQuestionIds = [];
      state.downgradedQuestionIds = [];
      state.feedbackRecords = [];
      createGenerationNotification(savedChapter);
      state.modal = "submitted";
      state.view = "home";
      state.tab = "home";
      saveState();
      render();
    })
    .catch((error) => {
      if (error.chapter) {
        const savedChapter = upsertChapter(error.chapter);
        state.reviewSession = null;
        createGenerationNotification(savedChapter);
        state.modal = "submitted";
        state.view = "home";
        state.tab = "home";
        saveState();
        return render();
      }
      state.generationErrorTitle = error.status === "failed_extract_article" ? "文章正文提取失败" : "暂时没能生成题目";
      state.generationError = error.message || "这段内容暂时没能生成可复习题目，请换一段更完整的内容再试。";
      state.view = "generation-error";
      state.tab = "add";
      render();
    });
}

function startRegenerate() {
  if (!state.chapter) return;
  const previous = state.chapter;
  const processingChapter = {
    ...previous,
    dismissedFromNotifications: false,
    status: previous.knowledgePoints?.length ? "auto_regenerating_questions" : "submitted",
    displayStatusText: previous.knowledgePoints?.length ? "正在检查题目质量" : "已提交，等待处理",
    failureReason: ""
  };
  upsertChapter(processingChapter);
  state.reviewSession = null;
  state.modal = "submitted";
  state.view = "home";
  state.tab = "home";
  saveState();
  render();

  requestRegeneration(previous)
    .then((chapter) => {
      const savedChapter = upsertChapter({ ...chapter, id: previous.id, createdAt: previous.createdAt, dismissedFromNotifications: false });
      state.reviewSession = null;
      state.currentQuestionIndex = 0;
      state.removedQuestionIds = [];
      state.downgradedQuestionIds = [];
      createGenerationNotification(savedChapter);
      saveState();
      render();
    })
    .catch((error) => {
      if (error.chapter) {
        const savedChapter = upsertChapter({ ...error.chapter, id: previous.id, createdAt: previous.createdAt, dismissedFromNotifications: false });
        createGenerationNotification(savedChapter);
      }
      saveState();
      render();
    });
}

async function requestGeneration(text) {
  const apiUrl = window.location.protocol === "file:"
    ? "http://127.0.0.1:5173/api/generate"
    : "/api/generate";
  const input = buildGenerationInput(text);
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input)
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status !== "completed") {
    if (payload?.chapter) {
      const error = new Error(payload.message || payload.chapter.failureReason || "生成失败");
      error.status = payload.status;
      error.chapter = normalizeGeneratedChapter(payload.chapter, text);
      throw error;
    }
    if (payload?.message) {
      const error = new Error(payload.message);
      error.status = payload.status;
      throw error;
    }
    throw new Error(payload?.message || "生成失败，请稍后重试。");
  }

  return normalizeGeneratedChapter(payload.chapter, text);
}

async function requestRegeneration(chapter) {
  const apiUrl = window.location.protocol === "file:"
    ? "http://127.0.0.1:5173/api/regenerate"
    : "/api/regenerate";
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ regenerateFromChapter: chapter })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status !== "completed") {
    const error = new Error(payload?.message || "重新生成失败，请稍后重试。");
    error.status = payload?.status;
    if (payload?.chapter) error.chapter = normalizeGeneratedChapter(payload.chapter, chapter.sourceText || "");
    throw error;
  }
  return normalizeGeneratedChapter(payload.chapter, chapter.sourceText || "");
}

function buildGenerationInput(text) {
  const value = text.trim();
  if (isLikelyUrl(value)) {
    if (isVideoLink(value)) {
      return {
        sourceType: "video_link",
        sourceUrl: value
      };
    }
    return {
      sourceType: "article_link",
      sourceUrl: value
    };
  }
  return {
    sourceType: "text",
    rawText: value
  };
}

function isLikelyUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isVideoLink(value) {
  const hostname = safeHostname(value);
  return [
    "bilibili.com",
    "m.bilibili.com",
    "youtube.com",
    "youtu.be",
    "douyin.com",
    "v.douyin.com",
    "xiaohongshu.com"
  ].some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

function normalizeGeneratedChapter(chapter, fallbackText) {
  const knowledgePoints = (chapter.knowledgePoints || []).map((point, index) => ({
    id: point.id || `kp-${index + 1}`,
    title: point.title || `知识点 ${index + 1}`,
    summary: point.summary || point.keyClaim || "",
    keyClaim: point.keyClaim || point.summary || "",
    knowledgeType: point.knowledgeType || "concept",
    sourceQuote: point.sourceQuote || "",
    sourceOrder: Number.isFinite(Number(point.sourceOrder)) ? Number(point.sourceOrder) : index,
    sourceStartOffset: Number.isFinite(Number(point.sourceStartOffset)) ? Number(point.sourceStartOffset) : null,
    sourceEndOffset: Number.isFinite(Number(point.sourceEndOffset)) ? Number(point.sourceEndOffset) : null
  })).sort(compareSourceOrder);

  const questions = (chapter.questions || []).map((question, index) => ({
    id: question.id || `q-${index + 1}`,
    knowledgePointId: question.knowledgePointId || question.pointId,
    pointId: question.pointId || question.knowledgePointId,
    pointTitle: question.pointTitle || knowledgePoints.find((point) => point.id === question.knowledgePointId)?.title || "",
    type: question.type || "multiple_choice",
    stem: question.stem || "",
    options: question.options || [],
    correctOptionId: question.correctOptionId || question.correct_answer,
    shortExplanation: question.shortExplanation || question.explanation || "",
    fullExplanation: question.fullExplanation || question.correctUnderstanding || question.correct_understanding || "",
    correctUnderstanding: question.correctUnderstanding || question.correct_understanding || question.fullExplanation || "",
    commonMisconception: question.commonMisconception || question.common_misconception || "",
    pitfalls: question.pitfalls?.length ? question.pitfalls : [question.commonMisconception || question.common_misconception || "容易只记住结论，而忽略它成立的条件。"],
    sourceQuote: question.sourceQuote || question.sourceSnippet || question.source_snippet || "",
    sourceSnippet: question.sourceSnippet || question.source_snippet || question.sourceQuote || "",
    difficulty: question.difficulty || "medium",
    qualityScore: question.qualityScore,
    sourceOrder: Number.isFinite(Number(question.sourceOrder)) ? Number(question.sourceOrder) : (knowledgePoints.find((point) => point.id === (question.knowledgePointId || question.pointId))?.sourceOrder ?? index),
    sourceStartOffset: Number.isFinite(Number(question.sourceStartOffset)) ? Number(question.sourceStartOffset) : (knowledgePoints.find((point) => point.id === (question.knowledgePointId || question.pointId))?.sourceStartOffset ?? null),
    sourceEndOffset: Number.isFinite(Number(question.sourceEndOffset)) ? Number(question.sourceEndOffset) : (knowledgePoints.find((point) => point.id === (question.knowledgePointId || question.pointId))?.sourceEndOffset ?? null),
    isNew: index === 0
  })).sort(compareSourceOrder);

  return {
    id: chapter.id || createId("chapter"),
    title: chapter.title || chapter.chapterTitle || "新添加的知识",
    status: chapter.status || "completed",
    displayStatusText: chapter.displayStatusText || "",
    failureReason: chapter.failureReason || "",
    sourceType: chapter.source?.type || chapter.sourceType || "text",
    sourceText: chapter.source?.rawText || fallbackText,
    source: chapter.source || { type: "text", rawText: fallbackText },
    knowledgePoints,
    filteredKnowledgePoints: chapter.filteredKnowledgePoints || [],
    questions,
    qualitySummary: chapter.qualitySummary,
    generationMeta: chapter.generationMeta,
    reviewSession: chapter.reviewSession || null,
    removedQuestionIds: chapter.removedQuestionIds || [],
    downgradedQuestionIds: chapter.downgradedQuestionIds || [],
    feedbackRecords: chapter.feedbackRecords || [],
    dismissedFromNotifications: Boolean(chapter.dismissedFromNotifications),
    masteredPoints: chapter.masteredPoints || 0,
    completed: (chapter.status || "completed") === "completed",
    createdAt: chapter.createdAt || Date.now(),
    updatedAt: chapter.updatedAt || Date.now()
  };
}

function compareSourceOrder(a, b) {
  const aOrder = Number.isFinite(Number(a.sourceOrder)) ? Number(a.sourceOrder) : Number.MAX_SAFE_INTEGER;
  const bOrder = Number.isFinite(Number(b.sourceOrder)) ? Number(b.sourceOrder) : Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) return aOrder - bOrder;
  const aStart = Number.isFinite(Number(a.sourceStartOffset)) ? Number(a.sourceStartOffset) : Number.MAX_SAFE_INTEGER;
  const bStart = Number.isFinite(Number(b.sourceStartOffset)) ? Number(b.sourceStartOffset) : Number.MAX_SAFE_INTEGER;
  if (aStart !== bStart) return aStart - bStart;
  return String(a.id || "").localeCompare(String(b.id || ""));
}

function startGenerateFallback() {
  const text = state.input.trim();
  if (text.length < 24) return;
  state.view = "generating";
  state.tab = "add";
  render();
  setTimeout(() => {
    upsertChapter(generateChapter(text));
    state.reviewSession = null;
    state.currentQuestionIndex = 0;
    createGenerationNotification(state.chapter);
    state.modal = "submitted";
    state.view = "home";
    state.tab = "home";
    saveState();
    render();
  }, 1100);
}

function render() {
  const app = document.getElementById("app");
  if (state.view === "home") app.innerHTML = renderHome();
  if (state.view === "add") app.innerHTML = renderAdd();
  if (state.view === "generating") app.innerHTML = renderGenerating();
  if (state.view === "generation-error") app.innerHTML = renderGenerationError();
  if (state.view === "chapters") app.innerHTML = renderChapters();
  if (state.view === "notifications") app.innerHTML = renderNotifications();
  if (state.view === "profile") app.innerHTML = renderProfile();
  if (state.view === "chapter") app.innerHTML = renderChapterDetail();
  if (state.view === "knowledge") app.innerHTML = renderKnowledge();
  if (state.view === "source") app.innerHTML = renderSource();
  if (state.view === "review") app.innerHTML = renderReview();
  if (state.view === "explanation") app.innerHTML = renderExplanation();
  if (state.view === "summary") app.innerHTML = renderSummary();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

loadState();
bindEvents();
render();
