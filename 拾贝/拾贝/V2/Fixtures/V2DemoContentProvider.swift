enum V2DemoContentProvider {
    static let recommendedArticleFilters: [V2RecommendedArticleFilter] = [
        V2RecommendedArticleFilter(id: "all", title: "全部", localizedTitle: ["zh-Hans": "全部", "en": "All"]),
        V2RecommendedArticleFilter(id: "ai", title: "AI", localizedTitle: ["zh-Hans": "AI", "en": "AI"]),
        V2RecommendedArticleFilter(id: "product", title: "产品", localizedTitle: ["zh-Hans": "产品", "en": "Product"]),
        V2RecommendedArticleFilter(id: "learning", title: "学习", localizedTitle: ["zh-Hans": "学习", "en": "Learning"]),
        V2RecommendedArticleFilter(id: "business", title: "商业", localizedTitle: ["zh-Hans": "商业", "en": "Business"])
    ]

    static let recommendedArticles: [V2RecommendedArticleItem] = [
        V2RecommendedArticleItem(
            id: "anthropic-ai-agents-product",
            title: "Anthropic 设计总监：为何您的整个团队都应该使用 AI Agents 协同工作",
            localizedTitle: [
                "zh-Hans": "Anthropic 设计总监：为何您的整个团队都应该使用 AI Agents 协同工作",
                "en": "Why Your Team Should Work With AI Agents"
            ],
            source: "微信公众号",
            localizedSource: ["zh-Hans": "微信公众号", "en": "WeChat Article"],
            sourceUrl: "https://example.com/anthropic-agents",
            sourceAuthor: "Anthropic",
            coverImageUrl: nil,
            tags: ["AI", "产品"],
            tagIDs: ["ai", "product"],
            description: "理解 AI Agents 在团队协作中的产品价值。",
            localizedDescription: [
                "zh-Hans": "理解 AI Agents 在团队协作中的产品价值。",
                "en": "Understand the product value of AI agents in team collaboration."
            ],
            hasPreparedChapter: false
        ),
        V2RecommendedArticleItem(
            id: "dmc-gamified-learning",
            title: "DMC 模型如何影响游戏化学习体验",
            localizedTitle: [
                "zh-Hans": "DMC 模型如何影响游戏化学习体验",
                "en": "How the DMC Model Shapes Gamified Learning"
            ],
            source: "推荐阅读",
            localizedSource: ["zh-Hans": "推荐阅读", "en": "Recommended Reading"],
            sourceUrl: "https://example.com/dmc-learning",
            sourceAuthor: "Recallo 精选",
            coverImageUrl: nil,
            tags: ["学习", "产品"],
            tagIDs: ["learning", "product"],
            description: "从 DMC 模型理解游戏化学习体验。",
            localizedDescription: [
                "zh-Hans": "从 DMC 模型理解游戏化学习体验。",
                "en": "Use the DMC model to understand gamified learning experiences."
            ],
            hasPreparedChapter: false
        )
    ]
}
