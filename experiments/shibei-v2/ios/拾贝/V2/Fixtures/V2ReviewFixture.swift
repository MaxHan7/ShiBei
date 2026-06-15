enum V2ReviewFixture {
    static let chapter = V2ReviewChapterData(
        title: "Anthropic设计总监：为何您的整个团队都应该使用AI Agents协同工作",
        overview: "这篇文章讨论团队如何把 AI Agents 当作协作同事，而不是只把它们看成个人效率工具。复习路径会先帮助你回忆文章主旨，再进入每个知识点的理解和应用。",
        sourceTitle: "Anthropic 设计总监：AI Agents 协同工作",
        units: [
            V2ReviewUnitData(
                id: "unit-1",
                title: "把 AI 当作协作同事",
                overview: "这个知识点强调，AI Agent 的价值不只是替个人完成任务，而是可以进入团队协作流程，承担收集、整理、检查和推进上下文的角色。",
                questions: [
                    V2ReviewQuestionData(
                        id: "u1-q1",
                        kind: .multipleChoice,
                        title: "轻量理解",
                        prompt: "在团队协作里，把 AI 当作协作同事，最核心的变化是什么？",
                        options: [
                            "让 AI 参与工作流中的信息整理和判断",
                            "只用 AI 替代所有会议和沟通",
                            "把 AI 当作一个搜索框随时问答案",
                            "只在写代码时才允许使用 AI"
                        ],
                        correctOptionIndex: 0,
                        matchingPairs: [],
                        feedback: "重点不是让 AI 取代团队，而是让它进入协作链路，帮助团队更快形成共享上下文。",
                        sourceExcerpt: "文章强调 AI Agents 应进入团队协作流程，帮助成员共享信息和推进工作。"
                    ),
                    V2ReviewQuestionData(
                        id: "u1-q2",
                        kind: .matching,
                        title: "匹配理解",
                        prompt: "把左侧的协作动作和右侧更适合 AI Agent 补位的价值匹配起来。",
                        options: [],
                        correctOptionIndex: nil,
                        matchingPairs: [
                            V2MatchingPairData(id: "m1", left: "收集反馈", right: "整理出重复出现的用户痛点"),
                            V2MatchingPairData(id: "m2", left: "推进任务", right: "提醒下一步和缺失信息"),
                            V2MatchingPairData(id: "m3", left: "检查方案", right: "发现边界条件和遗漏风险")
                        ],
                        feedback: "这些匹配都指向同一个理念：AI 更适合承担上下文整理、风险提醒和流程推进，而不是只输出一个孤立答案。",
                        sourceExcerpt: "原文把 AI Agents 放在协同工作场景中讨论，而不是只讨论个人提效。"
                    )
                ],
                completionMessage: "这个单元已经完成。你已经抓住了 AI Agent 从个人工具进入团队协作流程的关键。"
            ),
            V2ReviewUnitData(
                id: "unit-2",
                title: "让团队形成共享上下文",
                overview: "这个知识点关注共享上下文的重要性：当团队成员和 AI 都能看到足够清楚的信息，协作才不会停留在零散问答。",
                questions: [
                    V2ReviewQuestionData(
                        id: "u2-q1",
                        kind: .multipleChoice,
                        title: "场景应用",
                        prompt: "如果一个团队想让 AI 更稳定地协助项目推进，最应该优先补足什么？",
                        options: [
                            "让项目目标、约束和当前进展对 AI 可见",
                            "让每个人都单独维护自己的提示词",
                            "减少团队成员之间的沟通",
                            "只在项目结束后让 AI 总结"
                        ],
                        correctOptionIndex: 0,
                        matchingPairs: [],
                        feedback: "AI 协作的稳定性依赖上下文质量。目标、约束和进展越清楚，AI 越能做出有用判断。",
                        sourceExcerpt: "文章反复强调团队协作中的上下文、流程和角色分工。"
                    )
                ],
                completionMessage: "这个单元已经完成。你已经理解共享上下文为什么是 AI 协作的基础。"
            )
        ]
    )

    static var firstUnitID: String {
        chapter.units.first?.id ?? ""
    }

    static func unit(id: String) -> V2ReviewUnitData? {
        chapter.units.first { $0.id == id }
    }

    static func question(unitID: String, questionID: String) -> V2ReviewQuestionData? {
        unit(id: unitID)?.questions.first { $0.id == questionID }
    }

    static func firstQuestionID(in unitID: String) -> String? {
        unit(id: unitID)?.questions.first?.id
    }

    static func nextQuestion(after questionID: String, in unitID: String) -> V2ReviewQuestionData? {
        guard let questions = unit(id: unitID)?.questions,
              let index = questions.firstIndex(where: { $0.id == questionID }),
              questions.indices.contains(index + 1) else {
            return nil
        }
        return questions[index + 1]
    }

    static func nextUnit(after unitID: String) -> V2ReviewUnitData? {
        guard let index = chapter.units.firstIndex(where: { $0.id == unitID }),
              chapter.units.indices.contains(index + 1) else {
            return nil
        }
        return chapter.units[index + 1]
    }

    static func progressIndex(unitID: String, questionID: String? = nil) -> (current: Int, total: Int) {
        let total = chapter.units.reduce(0) { $0 + $1.questions.count }
        var current = 1

        for unit in chapter.units {
            if unit.id == unitID {
                if let questionID,
                   let questionIndex = unit.questions.firstIndex(where: { $0.id == questionID }) {
                    current += questionIndex
                }
                return (current, max(total, 1))
            }
            current += unit.questions.count
        }

        return (current, max(total, 1))
    }
}
