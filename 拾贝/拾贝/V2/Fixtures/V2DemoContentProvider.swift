enum V2DemoContentProvider {
    static let recommendedArticleFilters: [V2RecommendedArticleFilter] = [
        .all,
        .tag("AI"),
        .tag("产品"),
        .tag("金融")
    ]

    static let recommendedArticles: [V2RecommendedArticleItem] = [
        V2RecommendedArticleItem(
            id: "anthropic-ai-agents-product",
            title: "Anthropic 设计总监：为何您的整个团队都应该使用 AI Agents 协同工作",
            source: "微信公众号",
            tags: ["AI", "产品"]
        ),
        V2RecommendedArticleItem(
            id: "dmc-gamified-learning",
            title: "DMC 模型如何影响游戏化学习体验",
            source: "推荐阅读",
            tags: ["AI", "学习"]
        )
    ]
}
