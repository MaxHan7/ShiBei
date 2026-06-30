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

    static let home = V2HomeData(
        currentChapter: V2CurrentChapterData(
            eyebrow: "当前章节",
            title: "Anthropic设计总监：为何您的整个团队都应该使用AI Agents协同工作"
        ),
        nodes: [
            V2LearningPathNodeData(
                id: "start",
                title: "开始",
                subtitle: "章节概要",
                kind: .start,
                state: .start,
                action: .mainline,
                completedQuestionCount: 0,
                totalQuestionCount: 0,
                position: CGPoint(x: 0.66, y: 0.88)
            ),
            V2LearningPathNodeData(
                id: "unit-1",
                title: "单元1",
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
                title: "单元2",
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
                title: "单元3",
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
