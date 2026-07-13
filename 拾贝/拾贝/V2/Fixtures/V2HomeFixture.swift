import CoreGraphics

enum V2HomeFixture {
    static let empty = V2HomeData(
        currentChapter: V2CurrentChapterData(
            eyebrow: "",
            title: ""
        ),
        nodes: [],
        currentNodeID: ""
    )

    static let home = home(language: .zhHans)

    static func home(language: AppLanguage) -> V2HomeData {
        V2HomeData(
            currentChapter: V2CurrentChapterData(
                eyebrow: L10n.string("home.current_chapter", language: language),
                title: "Anthropic设计总监：为何您的整个团队都应该使用AI Agents协同工作"
            ),
            nodes: [
                V2LearningPathNodeData(
                    id: "start",
                    title: L10n.string("home.node.start", language: language),
                    subtitle: L10n.string("chapter.overview.title", language: language),
                    kind: .start,
                    state: .start,
                    action: .mainline,
                    completedQuestionCount: 0,
                    totalQuestionCount: 0,
                    position: CGPoint(x: 0.66, y: 0.88)
                ),
                V2LearningPathNodeData(
                    id: "unit-1",
                    title: L10n.format("home.node.unit", language: language, 1),
                    subtitle: "理解协作的切入点",
                    kind: .unit,
                    state: .current,
                    action: .mainline,
                    completedQuestionCount: 1,
                    totalQuestionCount: 3,
                    position: CGPoint(x: 0.28, y: 0.70)
                ),
                V2LearningPathNodeData(
                    id: "unit-2",
                    title: L10n.format("home.node.unit", language: language, 2),
                    subtitle: "把AI当作协作同事",
                    kind: .unit,
                    state: .locked,
                    action: .previewOnly,
                    completedQuestionCount: 0,
                    totalQuestionCount: 5,
                    position: CGPoint(x: 0.39, y: 0.47)
                ),
                V2LearningPathNodeData(
                    id: "unit-3",
                    title: L10n.format("home.node.unit", language: language, 3),
                    subtitle: "让团队形成共享上下文",
                    kind: .unit,
                    state: .locked,
                    action: .previewOnly,
                    completedQuestionCount: 0,
                    totalQuestionCount: 4,
                    position: CGPoint(x: 0.73, y: 0.31)
                )
            ],
            currentNodeID: "unit-1"
        )
    }
}
