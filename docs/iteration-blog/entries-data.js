window.iterationEntries = [
  {
    "date": "2026-05-14",
    "title": "完善 HTML Demo 和核心出题系统",
    "phase": "HTML Demo",
    "problem": "早期原型能展示概念，但视觉、复习流和失败恢复都不够完整。",
    "changes": [
      "统一暖白、橙色主按钮、黄色强调和 15px 圆角视觉体系。",
      "补齐生成、失败、通知、复习、反馈和来源流程。",
      "开始建立题目质量检查和失败恢复机制。"
    ],
    "screenshots": [
      {
        "src": "assets/2026-05-14-html-demo.svg",
        "caption": "HTML Demo 承担第一轮产品体验验证"
      }
    ],
    "result": "HTML Demo 成为 SwiftUI 迁移的视觉和流程基准。",
    "next": "用 Xcode 创建 SwiftUI 工程，迁移成可真机运行的 iOS mock。",
    "commits": [
      "994764e"
    ]
  },
  {
    "date": "2026-05-14",
    "title": "出题系统 V0：把生成拆成可控链路",
    "phase": "核心出题系统",
    "problem": "最早的生成能力如果只让模型一次性吐出题目，很难知道问题出在正文清洗、知识点、题目还是解释。",
    "changes": [
      "把链路拆成内容清洗、语义分块、知识点候选、知识点过滤、题目生成、质量检查和最终入池。",
      "题目输出固定包含正确答案、正确理解、常见误区、来源片段和质量分。",
      "失败章节也保留可进入的状态，让用户能看到失败原因而不是空白。"
    ],
    "screenshots": [
      {
        "src": "assets/question-logic-v0.svg",
        "caption": "V0 先把黑盒生成拆成可观察的流水线"
      }
    ],
    "result": "出题系统从一次性模型调用，变成可以定位问题、可以恢复失败的后端生成模块。",
    "next": "给题目入池前增加质量门槛，避免格式正确但复习价值低的题进入用户流程。",
    "commits": [
      "994764e"
    ]
  },
  {
    "date": "2026-05-15",
    "title": "出题系统 V1：题目入池前必须过质量门",
    "phase": "核心出题系统",
    "problem": "题目能生成不代表能复习：来源不支撑、答案不唯一、干扰项凑数都会损害用户信任。",
    "changes": [
      "建立六个质量维度：来源支撑、答案唯一、理解深度、表达清晰、干扰项质量、复习价值。",
      "引入 AI Judge，把题目标记为 pass、rewrite 或 discard。",
      "低质量题先尝试单题重写，重写后仍不可用才丢弃。"
    ],
    "screenshots": [
      {
        "src": "assets/question-logic-v1.svg",
        "caption": "V1 用质量门把“能生成”升级成“可入池”"
      }
    ],
    "result": "题目开始有明确入池标准，系统能区分可用题、可修题和必须丢弃的题。",
    "next": "解决长文后半段知识点缺失，以及每个知识点是否都有题覆盖的问题。",
    "commits": []
  },
  {
    "date": "2026-05-16",
    "title": "出题系统 V2：从局部读取走向全文覆盖",
    "phase": "核心出题系统",
    "problem": "长文如果只读取前面一部分 chunk，后半篇的重要知识点会缺失，题目自然也偏向文章前半段。",
    "changes": [
      "修正长文 chunk 覆盖策略，让知识点候选来自更完整的正文范围。",
      "测试报告保留被拒题和被过滤知识点诊断，方便判断是没提到、没出题，还是没过审。",
      "不再简单追求固定数量，而是检查最终保留知识点是否有可复习题覆盖。"
    ],
    "screenshots": [
      {
        "src": "assets/question-logic-v2.svg",
        "caption": "V2 让知识点来自全文，而不是只来自文章开头"
      }
    ],
    "result": "出题系统开始覆盖文章完整结构，减少“后半篇像没读过”的问题。",
    "next": "重写题型契约，避免场景判断题退化成普通二选一或事实复述。",
    "commits": []
  },
  {
    "date": "2026-05-16",
    "title": "出题系统 V3：重写题型契约",
    "phase": "核心出题系统",
    "problem": "早期题型约束不够硬，scenario_judgment 容易退化成“成立/不成立”，没有真正考场景迁移。",
    "changes": [
      "明确 multiple_choice、true_false、scenario_judgment 三类题的边界。",
      "规定 scenario_judgment 必须给出具体场景和 4 个行动、判断或处理方案。",
      "要求题干优先考边界、误区、对比和迁移应用，而不是问原文提到了什么。"
    ],
    "screenshots": [
      {
        "src": "assets/question-logic-v3.svg",
        "caption": "V3 把题型从形式分类变成理解任务"
      }
    ],
    "result": "题目开始更像复习训练，而不是原文填空或关键词识别。",
    "next": "降低整章失败率，让结构完整但未完全过审的题有机会以低置信方式服务复习。",
    "commits": []
  },
  {
    "date": "2026-05-16",
    "title": "完成 SwiftUI Mock 主流程",
    "phase": "iOS 原型",
    "problem": "HTML Demo 可用，但还不是原生 iOS 体验，无法验证真机交互和系统导航。",
    "changes": [
      "创建 SwiftUI 工程并迁移完整产品流。",
      "实现首页、添加、章节、通知、复习、解释、来源和总结页面。",
      "用系统 TabView 和自定义图标打磨底部导航。"
    ],
    "screenshots": [
      {
        "src": "assets/2026-05-16-swiftui-mock.svg",
        "caption": "SwiftUI mock 把 HTML 产品流迁移到原生 iOS"
      }
    ],
    "result": "iOS 端可以无网络走通完整 mock 流程，为后续接 API 打下基础。",
    "next": "接入本地 API，再逐步迁移到云端服务。",
    "commits": []
  },
  {
    "date": "2026-05-17",
    "title": "把真机生成接到 Railway 云端",
    "phase": "云端原型",
    "problem": "真机只能跑 mock 或本地 API，生成状态容易卡住，部署后内存数据也会丢失。",
    "changes": [
      "部署 Node 后端到 Railway。",
      "增加云端 API 模式。",
      "接入 PostgreSQL 和匿名设备 ID 保存章节与通知。"
    ],
    "screenshots": [
      {
        "src": "assets/2026-05-17-cloud-api.svg",
        "caption": "从本地 mock 走向可真机访问的云端生成"
      }
    ],
    "result": "真机可以提交真实文章到云端生成，章节数据也能跨部署保存。",
    "next": "稳定题目生成质量，减少生成失败和低质量题入池。",
    "commits": [
      "ac76759",
      "ee518e0",
      "ab5086e"
    ]
  },
  {
    "date": "2026-05-18",
    "title": "出题系统 V4：低置信题进入复习池",
    "phase": "核心出题系统",
    "problem": "只要某些知识点没有 pass 题，整章就可能失败；这对用户心智不友好，也浪费了已经提取出的可复习材料。",
    "changes": [
      "每个知识点优先选择最高分 pass 题。",
      "没有 pass 时，允许结构完整、来源可支撑、答案唯一的 rewrite 题低置信入池。",
      "章节只有最终 0 道可复习题时才判定为 failed_no_qualified_questions。"
    ],
    "screenshots": [
      {
        "src": "assets/question-logic-v4.svg",
        "caption": "V4 用低置信入池减少整章失败"
      }
    ],
    "result": "系统从“过不了审就失败”变成“尽量给每个知识点保留一道可复习题”。",
    "next": "低置信题不能变成问题垃圾桶，需要继续拆分来源、解释、干扰项等风险原因。",
    "commits": [
      "ad39028",
      "0b24225"
    ]
  },
  {
    "date": "2026-05-18",
    "title": "出题系统 V5：来源片段升级为解释上下文",
    "phase": "核心出题系统",
    "problem": "短引用可以证明题目来自原文，但不能帮助用户答错后重新理解文章。",
    "changes": [
      "把 sourceSnippet 从最短证据句升级为解释页用户可见的原文上下文段落。",
      "以后端定位 sourceQuote 为锚点，优先选择包含锚点的完整段落。",
      "段落太短时扩展相邻句，段落太长时按句子边界裁剪，避免无脑截取。"
    ],
    "screenshots": [
      {
        "src": "assets/question-logic-v5.svg",
        "caption": "V5 让来源片段服务理解，而不只是服务校验"
      }
    ],
    "result": "解释页开始承担“回到原文理解这道题”的作用，来源不再只是模型自证。",
    "next": "继续检查来源是否真的支撑正确答案，而不是只和知识点主题相关。",
    "commits": [
      "c57cc4c",
      "684623f"
    ]
  },
  {
    "date": "2026-05-18",
    "title": "出题系统 V6：正确答案位置后处理",
    "phase": "核心出题系统",
    "problem": "如果正确答案长期集中在 B，用户会形成位置预期，题目训练价值被破坏。",
    "changes": [
      "在题目归一化阶段做稳定选项重排，而不是只靠 prompt 提醒模型。",
      "重排后同步更新 correctOptionId，保证选项文本和正确答案一致。",
      "同一道题刷新时顺序稳定，一批题的正确答案位置尽量分散。"
    ],
    "screenshots": [
      {
        "src": "assets/question-logic-v6.svg",
        "caption": "V6 用确定性后处理解决正确答案位置偏置"
      }
    ],
    "result": "答案位置不再明显偏向某个选项，用户必须根据理解作答。",
    "next": "把题目顺序也和文章顺序对齐，让首次复习更像沿原文主线回忆。",
    "commits": [
      "5cc3fa5"
    ]
  },
  {
    "date": "2026-05-18",
    "title": "完善复习体验和解释来源",
    "phase": "SwiftUI 体验打磨",
    "problem": "用户做完最后一题会直接进总结，解释页来源片段也不够容易回到原文理解。",
    "changes": [
      "最后一题答完后先进入解释页。",
      "完整来源页支持跳到对应原文区域。",
      "题卡选项左对齐，正确答案位置做稳定分散。"
    ],
    "screenshots": [
      {
        "src": "assets/2026-05-18-review-flow.svg",
        "caption": "复习流程开始强调解释和原文回看"
      }
    ],
    "result": "复习不再只是答题，而是形成“答题 -> 解释 -> 回看来源 -> 总结”的闭环。",
    "next": "继续提升题目本身的来源支撑和解释可信度。",
    "commits": [
      "3631a81",
      "684623f",
      "5cc3fa5"
    ]
  },
  {
    "date": "2026-05-19",
    "title": "出题系统 V7：按原文顺序复习，并过滤导读来源",
    "phase": "核心出题系统",
    "problem": "题目顺序如果乱跳，用户不容易沿文章主线回忆；同时公众号开头的导读/金句容易被误当成正文依据。",
    "changes": [
      "知识点和题目保留 sourceOrder、sourceStartOffset、sourceEndOffset。",
      "首次复习按文章实际内容先后创建队列，答错后的强化题再按间隔插入。",
      "文章开头导读、金句摘录、编辑摘要标记为 lead_summary，只能辅助理解主题，不能作为题目来源锚点。"
    ],
    "screenshots": [
      {
        "src": "assets/question-logic-v7.svg",
        "caption": "V7 让复习顺序和来源锚点更接近真实文章结构"
      }
    ],
    "result": "用户首次复习更流畅，系统也减少从文章开头总结段直接出题的问题。",
    "next": "进一步让知识点本身从“可出题片段”升级成“文章理解地图”。",
    "commits": []
  },
  {
    "date": "2026-05-21",
    "title": "搭建 AI 预标注质量工作台",
    "phase": "质量评测",
    "problem": "单篇人工检查太慢，无法稳定发现出题系统的问题分布。",
    "changes": [
      "新增独立质量工作台。",
      "输入文章后自动生成题目、AI 预标注，并保留人工确认字段。",
      "扩展测试集报告和人工评分维度。"
    ],
    "screenshots": [
      {
        "src": "assets/2026-05-21-quality-workbench.svg",
        "caption": "质量工作台把生成、预标注和人工检查放到同一页面"
      }
    ],
    "result": "出题系统开始从“凭手感修”进入“批量评测 + 人工确认 + 数据统计”的循环。",
    "next": "用固定测试集持续比较每轮 prompt 和规则改动。",
    "commits": [
      "7c6c1b3"
    ]
  },
  {
    "date": "2026-05-22",
    "title": "进入出题可信度闭环阶段",
    "phase": "出题质量系统",
    "problem": "知识点提取开始变稳，但低置信题暴露出来源支撑、解释一致性和干扰项质量问题。",
    "changes": [
      "明确下一轮优先处理来源支撑和解释一致性。",
      "把低置信题从单一标签拆成后续可诊断的质量风险。",
      "继续把知识点逻辑调整为不硬编码数量，而是按文章密度精简入池。"
    ],
    "screenshots": [
      {
        "src": "assets/2026-05-22-quality-loop.svg",
        "caption": "出题系统从单点 prompt 调整转向质量闭环"
      }
    ],
    "result": "产品迭代重心从“能生成题”转向“题目什么时候可信”。",
    "next": "实现来源支撑、解释一致性和低置信分层的后处理链路。",
    "commits": []
  },
  {
    "date": "2026-05-22",
    "title": "出题系统 V8：知识点主线化",
    "phase": "核心出题系统",
    "problem": "知识点如果只按可考性筛选，容易保留局部细节；用户复习完不一定能重建文章核心观点。",
    "changes": [
      "新增 structureRole、importanceScore、coverageReason，判断知识点在文章结构中的角色。",
      "优先保留 main_claim、method_step、supporting_reason 和关键 boundary。",
      "不硬编码固定知识点数量，而是按文章长度和内容密度动态精简入池。"
    ],
    "screenshots": [
      {
        "src": "assets/question-logic-v8.svg",
        "caption": "V8 把知识点从可出题片段升级为文章理解地图"
      }
    ],
    "result": "出题系统的第一层基础变得更像产品想要的复习对象：主线、方法、边界和可迁移判断。",
    "next": "进入可信度闭环：来源支撑、解释一致性、干扰项质量和低置信原因分层。",
    "commits": []
  },
  {
    "date": "2026-05-22",
    "title": "章节列表和题卡反馈减负",
    "phase": "SwiftUI 产品体验打磨",
    "problem": "章节列表缺少复习完成反馈，题卡里的忘记按钮存在感过强，容易打断用户做题主路径。",
    "changes": [
      "全部章节卡片右上角增加待复习、复习中、已完成状态。",
      "把做题页的忘记了降级为选项列表末尾的轻量文字按钮。"
    ],
    "screenshots": [
      {
        "src": "assets/2026-05-22-章节列表和题卡反馈减负.svg",
        "caption": "2026-05-22 迭代摘要"
      }
    ],
    "result": "用户能在章节列表获得更强完成反馈，做题页的主注意力回到选项本身。",
    "next": "继续推进出题可信度闭环，优先修来源支撑和解释一致性。",
    "commits": []
  },
  {
    "date": "2026-05-23",
    "title": "拾贝 2026-05-23 产品迭代",
    "phase": "讨论与评估",
    "problem": "当天没有检测到明确代码提交，主要沉淀讨论、评估或下一步方向。",
    "changes": [
      "梳理当天讨论和下一轮产品优先级。"
    ],
    "screenshots": [
      {
        "src": "assets/2026-05-23-拾贝-2026-05-23-产品迭代.svg",
        "caption": "2026-05-23 迭代摘要"
      }
    ],
    "result": "保留当天思考过程，避免产品判断散落在对话里。",
    "next": "继续推进当前优先级最高的产品问题。",
    "commits": []
  },
  {
    "date": "2026-05-24",
    "title": "拾贝 2026-05-24 产品迭代",
    "phase": "产品迭代",
    "problem": "发布/提审相关产物与设置页呈现需要进一步收敛，避免影响日常开发与发布流程体验。",
    "changes": [
      "清理 release profile 设置页 UI（结构更清晰，减少冗余呈现）。",
      "补充 .gitignore：忽略本地 App Store / 归档相关产物，避免污染工作区。"
    ],
    "screenshots": [
      {
        "src": "assets/2026-05-24-拾贝-2026-05-24-产品迭代.svg",
        "caption": "2026-05-24 迭代摘要"
      }
    ],
    "result": "完善发布档位设置展示与清理本地 App Store 相关产物的忽略规则，降低误提交/误干扰风险。",
    "next": "补齐发布流程自检清单（证书/APNs/TestFlight）并在真机上回归设置页关键路径。",
    "commits": [
      "3696c87",
      "283d6bc",
      "ee690e2",
      "cc4323c",
      "71d0738"
    ]
  },
  {
    "date": "2026-05-25",
    "title": "系统通知从“配置好了”变成“可诊断”",
    "phase": "TestFlight 发布准备",
    "problem": "真机已经请求通知权限，Railway 也显示 APNs 配置完成，但生成结束后用户仍收不到系统通知。原有链路只能知道“配置是否存在”，无法判断设备 token 是否上传、环境是否匹配、APNs 是否返回错误。",
    "changes": [
      "iOS 在首次授权、回到前台、提交云端生成前后主动同步 APNs token，减少 token 未上传或过期导致的漏发。",
      "后端新增 push-status 诊断接口，按匿名设备展示 token 尾号、sandbox/production 环境和最近通知的 APNs 发送结果。",
      "通知记录补充 pushAttemptedAt、pushSentAt、pushDeliveryStatus、pushDeliveryError 和 pushAttemptCount，方便定位 BadDeviceToken、BadEnvironmentKeyInToken 等问题。",
      "启动加载页承接云端首次同步时间，避免刚打开 App 时短暂显示空首页。"
    ],
    "screenshots": [
      {
        "src": "assets/2026-05-25-apns-notification-diagnostics.svg",
        "caption": "把通知链路拆成权限、token、云端发送和点击归档四个可检查节点"
      }
    ],
    "result": "通知问题不再只靠猜：可以逐步确认 App 是否上传 token、后端是否尝试发送、Apple 返回了什么错误。TestFlight 前的通知闭环更接近可验收状态。",
    "next": "部署 Railway 后用新版 TestFlight 真机回归：授权通知、提交生成、后台等待通知、点击进入章节详情，并检查 push-status 诊断结果。",
    "commits": [
      "fa12d54"
    ]
  },
  {
    "date": "2026-05-25",
    "title": "收藏题目入口收敛到章节页",
    "phase": "SwiftUI 体验打磨",
    "problem": "收藏题目如果作为单独题集卡片，页面只有一个入口时信息密度很低；收藏页再放“开始复习”按钮，也会和点击单题进入复习的心智冲突。",
    "changes": [
      "章节 tab 顶部改为“全部章节 / 收藏题目”两个同层级页面，支持点击和左右滑动切换。",
      "收藏页只展示收藏题卡片；没有收藏时只在页面中央显示“没有收藏题目”。",
      "收藏题卡片改为小黄点 + 知识点 + 题干 + 来源章节，弱化装饰，突出复习对象。"
    ],
    "screenshots": [
      {
        "src": "assets/2026-05-25-favorite-questions-section.svg",
        "caption": "收藏题目从单张题集卡片收敛为章节 tab 内的独立页面"
      }
    ],
    "result": "章节页层级更像标准 iOS 内容页面，收藏题目也从“一个孤立入口”变成可持续扩展的复习列表。",
    "next": "回到核心出题系统，继续优化来源支撑、解释一致性和低置信分层。",
    "commits": [
      "3e3f0c8"
    ]
  },
  {
    "date": "2026-05-25",
    "title": "ReviewSession V2 question-first",
    "phase": "复习状态机",
    "problem": "出题系统已恢复同一知识点 1–3 道入池题，但复习调度仍以‘每知识点抽 1 题’为隐含前提：进度条按知识点算、强化按知识点插入、完成条件又要求知识点都答对。结果是多题型产出被浪费，且在最后一题答错时可能出现‘无限强化/反复出现’或无法进入总结，破坏用户对复习闭环的信任。",
    "changes": [
      "ReviewSession schemaVersion 升级到 v2，构建队列从‘按知识点挑 1 题’改为‘按知识点顺序铺开所有可复习题’，同点内保持稳定排序。",
      "答题提交与状态统计改为 queueItemId 驱动：attempt 记录 queueItemId，completedQueueItemIds 作为进度条与完成条件依据，并校验 questionId 与队列项匹配以防客户端漂移。",
      "强化调度粒度从 knowledgePointId 改为 questionId：同题最多强化 2 次，超过后落入 needsReviewQuestionIds 并允许 session 完成，避免无限循环。",
      "active legacy session 在恢复时迁移：保留已答对题目的完成事实并补齐缺失的主队列题，确保升级后不会重刷或卡死。",
      "更新 iOS 数据契约与客户端：ReviewSession/ReviewAttempt 增加 schemaVersion、reinforcementAttempt、queueItemId 等字段，提交 attempt 时带上当前队列项 id。"
    ],
    "screenshots": [
      {
        "src": "assets/2026-05-25-reviewsession-v2-question-first.svg",
        "caption": "2026-05-25 迭代摘要"
      }
    ],
    "result": "后端以题目队列作为唯一复习事实来源：队列覆盖所有可复习主队列题目，完成条件改为 completedQueueItemIds 全覆盖；同题强化最多 2 次，超过后进入 needsReviewQuestionIds 但不阻塞本轮结束；masteredThisRoundPointIds 由该知识点的主队列题目全对聚合得到。对应的 reviewSessionLifecycle 单测覆盖了：多题入队、知识点掌握聚合、最后一题强化封顶与 v1→v2 迁移。iOS 端提交 attempt 时补齐 queueItemId，避免‘题目与队列项不一致’导致的进度与统计漂移。",
    "next": "用真机回归 3 类章节：同点多题(全对/最后一题错/连续错)、中途反馈移除题目、收藏题入口复习；同时确认 needsReviewQuestionIds 是否需要在总结页显式提示。",
    "commits": [
      "9285345",
      "fa12d54",
      "9a15874",
      "8de939d",
      "c7cef80",
      "ff5eb3c",
      "cbc6573",
      "3e3f0c8",
      "d9d0f0d",
      "ad3ca7b",
      "b200e1e",
      "2a960c1",
      "bdaafff"
    ]
  },
  {
    "date": "2026-05-25",
    "title": "出题系统 V9：恢复多题型强化",
    "phase": "核心出题系统",
    "problem": "实际使用中题目质量已经及格，但 PRD 里的每个知识点 1-3 道题、不同题型强化记忆被后处理压成了每个知识点最多 1 道题。",
    "changes": [
      "把最终入池选择器从一点一题改为最多 3 题，优先保留 multiple_choice、true_false、scenario_judgment 等不同题型。",
      "补题逻辑从没有 pass 才补，改为未达到目标题数或题型覆盖不足时补。",
      "保留质量底线：结构坏、答案不唯一、来源不支撑的题仍然 blocked；轻微风险题以低置信入池。"
    ],
    "screenshots": [
      {
        "src": "assets/2026-05-25-出题系统-v9-恢复多题型强化.svg",
        "caption": "V9 恢复每个知识点多题型强化记忆"
      }
    ],
    "result": "出题系统重新回到多角度记忆强化目标，同时保留来源支撑和答案唯一性的质量底线。",
    "next": "用质量工作台观察每知识点平均题数、3 题覆盖率、题型分布和低置信题人工可用率。",
    "commits": []
  },
  {
    "date": "2026-05-25",
    "title": "复习完成反馈长期化",
    "phase": "SwiftUI 体验打磨",
    "problem": "用户完成一章后再次复习，首页已掌握知识点和章节列表状态会被新一轮 ReviewSession 拉回未完成，完成反馈被撤销。",
    "changes": [
      "把 masteredPoints 定义为长期累计成果，不再跟随当前复习轮次清零。",
      "章节卡片用待复习、复习中、已完成表达复习状态，去掉已完成章节上价值不大的“已生成”标签。",
      "生成中和生成失败标签统一放在章节卡片左上角，保持任务状态位置一致。"
    ],
    "screenshots": [],
    "result": "用户二刷不会失去已完成反馈，首页已掌握数量和章节列表状态更符合长期学习心智。",
    "next": "继续用真机回归章节复习、二刷、失败章节和生成中章节的列表状态。",
    "commits": []
  },
  {
    "date": "2026-05-26",
    "title": "成本计算工作台和模型用量审计",
    "phase": "服务端成本治理",
    "problem": "要做模型选择与定价，需要看到‘单篇章节生成’在各阶段的真实 token/成本（含估算误差），但这些成本调试数据又不能进入 iOS App 的主接口或章节数据，否则会污染用户数据契约、增加分发风险。今天的问题是：如何把成本观测从用户主流程中剥离出来，同时仍能把每次生成的用量、估算与误差留成可审计证据？",
    "changes": [
      "在 generation 层引入 runId + modelUsage 记录：每次模型调用同时记录 request 文本、估算 input/output tokens、真实 usage、成本与误差率，形成可回放的用量轨迹。",
      "新增 cost-runs 工作台 API：用独立接口触发/查看成本计算结果，并把结果保存为 latest.json 与 runId.json，避免与章节持久化/通知逻辑耦合。",
      "提供独立 HTML 成本计算页面（demo/cost-calculator）：输入正文即可跑一轮成本审计，并支持复制/下载整份成本 JSON 作为离线对比材料。",
      "客户端章节序列化时剥离 generationRunId、modelUsage、costSummary 等调试字段，保持 App 主接口‘只承载复习所需信息’的契约边界。",
      "（Supporting）SwiftUI 收藏题按知识点聚合展示、章节详情页移除无行动价值的‘已生成’状态，降低信息噪音。"
    ],
    "screenshots": [
      {
        "src": "assets/2026-05-26-成本计算工作台和模型用量审计.svg",
        "caption": "成本工作台将模型用量与用户主流程隔离"
      }
    ],
    "result": "现在可以用成本工作台对单篇生成做端到端审计：既能看到分阶段估算成本与真实 usage 的差异，也能把每次运行的 JSON 留存为证据；同时 iOS 侧保持数据契约干净，不需要携带成本调试字段进入用户流程。",
    "next": "用成本工作台跑一组真实长文样本：按模型/参数形成‘质量（judge 结果）× 成本（分阶段）’对照表，反推出下一轮默认模型与阈值策略。",
    "commits": [
      "65369f4",
      "871b2c2",
      "c30566b",
      "7016972",
      "9adc5ec",
      "41002f6",
      "69490e5",
      "304df0e",
      "ffc6f24",
      "bfcb080"
    ]
  },
  {
    "date": "2026-05-27",
    "title": "章节生成任务队列化：Web 提交、Worker 领取执行",
    "phase": "基础设施 / 生产化准备",
    "problem": "章节生成目前与 Web/API 进程的 HTTP 生命周期强耦合：一次提交会占用长时间请求/进程资源，遇到重启或超时就丢失进度；同时 Railway 云端原型也无法用单进程既承载 API 又跑长任务。需要把生成变成可领取、可追踪、可恢复的后台任务，让‘长内容→可复习知识’的主路径在云端也能稳定跑通。",
    "changes": [
      "后端：引入 PostgreSQL generation job 队列；创建章节时写入 status=submitted 的 job，Web 立即 202 返回 submitted chapter，避免模型调用绑在 HTTP 生命周期上。",
      "Worker：新增 backend/src/worker.js 轮询 claim job（可配置并发/轮询间隔/锁时长/优雅退出），调用 generationJobRunner 执行任务并回写 job 状态。",
      "生成执行：抽出 backend/src/generationJobRunner.js 统一处理 create/regenerate 两类任务；在执行中持续写入 chapter.currentStage 与 generationMeta.stages，并对超时/可重试错误做归类，失败时回填失败章节与通知。",
      "部署文档：补充 Railway 云端原型的双服务形态（Web/API + Worker）及验证要点；明确只启动 Web 会导致任务仅提交不执行。",
      "Supporting：成本计算工作台补上复制/下载本次成本 JSON 的出口，方便把一次生成的用量、质量摘要与外部评审/回归记录对齐。"
    ],
    "screenshots": [
      {
        "src": "assets/2026-05-27-章节生成任务队列化-web-提交-worker-领取执行.svg",
        "caption": "2026-05-27 迭代摘要"
      }
    ],
    "result": "在启用 DATABASE_URL 时，POST /api/chapters 会生成 submitted chapter 并写入 generation job；启动 worker 后可领取并执行 job，章节会随 stage 更新并在结束时落库通知。未配置数据库时仍保持旧路径：Web 进程内直接生成，保证本地演示与调试不被阻塞。",
    "next": "把队列化带来的‘可观测性’补齐：在成本/质量工作台展示 job 队列与重试轨迹（耗时、锁超时、失败原因分布），并用质量测试集回归队列化前后生成结果的一致性与成本波动。",
    "commits": []
  }
];
