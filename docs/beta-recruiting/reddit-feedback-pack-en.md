# Reddit Feedback Pack for Shibei Beta

Date: 2026-05-27

## Positioning

Reddit is a secondary channel for English-language feedback, not the main conversion channel. Use founder voice, disclose affiliation clearly, and avoid dropping a public TestFlight link in the post body.

Relevant Reddit guidance checked on 2026-05-27:

- Reddit Help says each community can set and enforce its own rules, so check the target subreddit rules before posting: https://support.reddithelp.com/hc/en-us/articles/360043503951-What-are-Reddit-s-rules
- Reddit Help notes promotional content is not automatically spam, but some communities disallow it and others expect roughly 90% helpful, non-promotional participation: https://support.reddithelp.com/hc/en-us/articles/28012014962580-How-do-I-keep-spam-out-of-my-community
- r/iOSApps recently requires community karma, ABC format, pricing/IAP disclosure, flair, and has restrictions around AI-first apps: https://www.reddit.com/r/iosapps/comments/1t00stp/riosapps_moderation_update_improving_post_quality/

## Candidate Subreddits

| Subreddit | Priority | Fit | Risk | Recommended move |
|-----------|----------|-----|------|------------------|
| r/SideProject | P0 | Founder story + beta feedback fits | Medium | Post story-first, no public link, ask for feedback |
| r/iOSApps | P1 | iOS app audience | High | Only post after meeting current community requirements; use ABC format and disclose Beta/free status |
| r/productivity | P1 | Users care about learning workflows | High | Comment-first; avoid app pitch unless rules allow |
| r/GetStudying | P1 | Study/review use case | Medium-high | Ask about study workflow pain first; do not lead with product |
| r/PKMS | P1 | Personal knowledge management fit | Medium-high | Discuss "review layer for PKM" and ask for critique |
| r/Anki | P2 | Spaced repetition users | High | Only discuss as workflow research; avoid app promotion unless rules explicitly allow |

## Posting Checklist

Before posting in any subreddit:

- Read subreddit rules and pinned posts on the same day.
- Confirm account age, karma, flair, pricing disclosure, and self-promotion requirements.
- Leave at least 3 useful comments in the target subreddit before posting.
- Do not post the same copy to multiple subreddits.
- Do not include a public TestFlight link unless rules explicitly allow it.
- Disclose: "I am the founder/builder."
- Stay in the comments for the first hour and reply to feedback.

## P0 Draft: r/SideProject

**Title A:** I built an iOS beta that turns articles into review questions. Looking for blunt feedback.

**Title B:** I got tired of saving articles I never revisited, so I built a small review-card app.

**Post body:**

Hi, I am building an early iOS beta called Shibei.

The problem is personal: I read a lot of AI/product/business articles, save them, and then realize a week later that I only remember the vague feeling of "this was useful."

So I built a small app that tries to close that loop:

1. Paste text or an article link.
2. The app extracts knowledge points.
3. It generates a few review questions.
4. You answer them like flashcards.
5. If you miss one, you can inspect the explanation and source context.

It is not meant to replace Notion, Obsidian, Readwise, or Anki. I am testing a narrower question:

Can AI-generated questions help people move from "I read this" to "I can actually recall and use this"?

Current state:

- iOS beta
- Free during beta
- No account system yet; uses an anonymous device identity
- Best tested with articles or pasted text
- Video links are not stable yet
- User-submitted content is uploaded to a backend for generation and may be processed by third-party AI model providers

I am looking for 20-50 testers who are willing to test with one article they genuinely want to remember, then tell me:

- Was the first add flow clear?
- Was the generation wait acceptable?
- Were the questions useful or too shallow?
- Did the explanation/source context build trust?
- At what point did you want to quit?

If you are open to trying it, comment or DM me and I will send the beta link manually. I am avoiding a public link because I want fewer but better testers for this first round.

Happy to hear critical feedback on the concept even if you do not want to test.

## P1 Draft: r/PKMS

**Title A:** Does a personal knowledge base need a review layer?

**Title B:** I am testing a small "active recall" layer for saved articles and notes.

**Post body:**

I am building an early iOS beta around a PKM-adjacent idea and would appreciate critique from people who already use tools like Obsidian, Notion, Logseq, Readwise, or similar systems.

My hypothesis:

Most PKM tools are strong at capture and organization, but weak at checking whether an idea has become recallable knowledge.

The beta is intentionally narrow:

- paste an article link or text
- extract knowledge points
- generate review questions
- answer them in a lightweight card flow
- inspect the explanation and source context
- flag bad questions

I am not trying to replace a knowledge base. I am trying to test whether a review layer should sit on top of saved material.

Limitations:

- early iOS beta
- no account system yet
- free during beta
- submitted content is uploaded for generation and may be processed by third-party AI model providers
- currently better for articles/text than video

Question for this community:

Would you want your notes/articles to occasionally "quiz you", or would that feel like the wrong mental model for PKM?

If anyone wants to test with one real article, comment or DM me and I can send the beta link manually.

## P1 Draft: r/iOSApps ABC Format

Use only if current subreddit rules allow the post and the account meets requirements.

**Title:** [Free Beta] Shibei turns articles into review questions for lightweight learning

**Post body:**

**A - Answer:** Shibei helps with a problem I personally have: I save useful articles and notes, but rarely revisit them. The app turns pasted text or article links into knowledge points and review questions, so you can test whether you actually understood the content.

**B - Better:** It is not a general notes app or a generic AI summarizer. The focus is the review loop: generated questions, answer feedback, explanations, source context, and bad-question feedback.

**C - Cost:** Free during beta. No IAP or subscription in the current beta. Future pricing is not decided.

Current limitations:

- iOS beta
- no account system yet; anonymous device identity
- best with text/article links
- video links are not stable yet
- submitted content is uploaded for generation and may be processed by third-party AI model providers

I am the founder/builder. I am looking for a small number of testers who are willing to try one real article and tell me whether the questions are useful. Comment or DM me if you want the TestFlight link.

## Comment Templates

**Positive interest:**
Thanks. I am sending the beta link manually because I am trying to keep the first group small and feedback-heavy. The test task is one real article: add it, wait for generation, do one review round, then tell me where the experience breaks.

**Privacy concern:**
Totally fair concern. In this beta, submitted text/links are uploaded to the backend for generation and may be processed by third-party AI model providers. The app currently uses an anonymous device identity and has a delete-my-data path. If that is not acceptable, I would skip this beta.

**"Why not Anki/Readwise/Obsidian?":**
Those tools are useful and I do not see Shibei as a replacement. I am testing a narrower layer: can your own saved material become review questions with source-backed explanations, without manually writing cards?

**Critical feedback:**
This is useful. The main thing I am trying to learn is whether generated questions can be good enough to create trust. If you have an example where this would fail, I would love to hear it.

