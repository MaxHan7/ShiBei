enum V2DemoContentProvider {
    static let recommendedArticleFilters: [V2RecommendedArticleFilter] = [
        V2RecommendedArticleFilter(id: "all", title: "全部"),
        V2RecommendedArticleFilter(id: "AI", title: "AI"),
        V2RecommendedArticleFilter(id: "产品", title: "产品"),
        V2RecommendedArticleFilter(id: "金融", title: "金融")
    ]

    static let recommendedArticles: [V2RecommendedArticleItem] = [
        V2RecommendedArticleItem(
            id: "anthropic-ai-agents-product",
            title: "Anthropic 设计总监：为何您的整个团队都应该使用 AI Agents 协同工作",
            source: "微信公众号",
            sourceUrl: "https://example.com/anthropic-agents",
            sourceAuthor: "Anthropic",
            coverImageUrl: nil,
            tags: ["AI", "产品"],
            description: "理解 AI Agents 在团队协作中的产品价值。",
            hasPreparedChapter: false
        ),
        V2RecommendedArticleItem(
            id: "dmc-gamified-learning",
            title: "DMC 模型如何影响游戏化学习体验",
            source: "推荐阅读",
            sourceUrl: "https://example.com/dmc-learning",
            sourceAuthor: "拾贝精选",
            coverImageUrl: nil,
            tags: ["AI", "学习"],
            description: "从 DMC 模型理解游戏化学习体验。",
            hasPreparedChapter: false
        )
    ]
}
