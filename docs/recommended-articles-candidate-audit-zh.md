# 推荐好文候选审查

生成时间：2026-06-28T00:05:01.752Z

## 策略

- 目标读者：Broad beta users who want valuable but approachable learning material
- 目标长度：3000-8000 Chinese characters or comparable English length after cleanup
- 入池流程：Candidates must pass source access, extraction, chapter-generation, and human quality review before moving into recommended-articles.json

## 审查结果

| ID | 标题 | 来源 | 标签 | 抽取长度 | 状态 | 备注 |
| --- | --- | --- | --- | ---: | --- | --- |
| google-llm-introduction | [Introduction to Large Language Models](https://developers.google.com/machine-learning/crash-course/llm) | Google for Developers | AI, 学习 | 8531 | direct_html_ready | Ready for generation input review. |
| ibm-large-language-models | [What Are Large Language Models (LLMs)?](https://www.ibm.com/think/topics/large-language-models) | IBM Think | AI, 产品 | 27241 | long_needs_excerpt | Extracted text is long; generate from a reviewed excerpt or expect higher model cost. |
| nng-usability-heuristics | [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/) | Nielsen Norman Group | 产品, 设计 | 14045 | long_needs_excerpt | Extracted text is long; generate from a reviewed excerpt or expect higher model cost. |
| producttalk-continuous-discovery | [Everyone Can Do Continuous Discovery—Even You! Here’s How](https://www.producttalk.org/getting-started-with-discovery/) | Product Talk | 产品, 商业 | 25963 | long_needs_excerpt | Extracted text is long; generate from a reviewed excerpt or expect higher model cost. |
| imf-inflation-prices-on-the-rise | [Inflation: Prices on the Rise](https://www.imf.org/-/media/files/publications/fandd/back-to-basics/oner-inflation.pdf) | IMF Finance & Development | 经济, 金融 | 0 | needs_pdf_or_manual_text | PDF source. Use a local text file extracted from the PDF for generation, then keep the public source URL for attribution. |
| learning-scientists-six-strategies | [Six Strategies for Effective Learning](https://www.learningscientists.org/blog/2016/8/18-1) | The Learning Scientists | 学习, 认知 | 4576 | direct_html_ready | Ready for generation input review. |
| retrieval-practice-powerful-strategy | [Retrieval Practice: A Powerful Strategy for Learning](https://www.retrievalpractice.org/retrievalpractice) | RetrievalPractice.org | 学习, 认知 | 2826 | direct_html_ready | Ready for generation input review. |
| christensen-disruptive-innovation | [Disruptive Innovation Theory](https://www.christenseninstitute.org/theory/disruptive-innovation/) | Christensen Institute | 商业, 创新 | 10911 | direct_html_ready | Ready for generation input review. |

## 状态解释

- direct_html_ready：现有网页抽取器可以拿到适中正文，可进入生成前人工快速审阅。
- long_needs_excerpt：正文可抽取，但有明显导航/营销/评论等噪声或长度偏长，建议先做节选清洗。
- short_needs_review：正文可抽取但偏短，需确认是否足够形成一个完整章节。
- needs_pdf_or_manual_text：PDF 或非 HTML 来源，管理员生成时应先保存干净文本文件，再跑生成。
- failed：当前抽取器失败，需更换来源或手动提供正文。

## 下一步

1. 对 direct_html_ready 的文章先跑 V2 生成实验。
2. 对 long_needs_excerpt 的文章先人工/脚本清洗成 3000-8000 字左右的学习版文本。
3. 对 PDF 文章先抽取干净文本文件，使用原始 URL 做来源归属。
4. 生成完成并人工验收后，把对应 prepared chapter 移入 backend/content/recommended/，再加入 backend/content/recommended-articles.json。
