# AI Knowledge Review Product Design

Date: 2026-04-27

## Product Positioning

This product is an "AI Baicizhan for personal knowledge": a lightweight review app that turns random daily knowledge inputs into short, testable review sessions.

The core promise is:

> Users only need to feed content and answer questions. The agent handles extraction, organization, question generation, and review scheduling.

The product should not start as a traditional knowledge base. Its first screen and core habit loop should be review-first: open the app, answer today's questions, and leave with a stronger memory of knowledge the user already cared enough to collect.

## Target User

The initial user is someone who frequently saves fragmented learning material from WeChat articles, Xiaohongshu posts, product theory notes, AI and large model discussions, business frameworks, and similar content.

They do not want to manually organize everything. They want a convenient way to convert scattered input into repeated retrieval practice.

## Core Use Case

1. The user sees useful knowledge in daily browsing.
2. The user sends text, screenshots, or links into the app like sending a message.
3. The agent extracts concepts, judgments, scenarios, and examples.
4. The app generates high-quality quiz items with explanations and source references.
5. The user opens the app later and completes a short "today's review" session.
6. The system schedules future review based on the user's answers.

## Product Principles

- Review is the main product, not knowledge management.
- Feeding content should feel as easy as sending a message.
- Questions should test understanding, not only literal recall.
- Each answer should provide a short explanation and a source trace.
- The MVP should avoid heavy knowledge graph, social, collaboration, or public library features.
- The app should feel light, fast, and habit-forming, similar to vocabulary review products.

## MVP Scope

### Inputs

The MVP supports three input types:

- Pasted text
- Uploaded screenshots or images
- Pasted links

The first version does not require deep integration with WeChat, Xiaohongshu, browser extensions, or platform APIs. A simple chat-style feed is enough.

### Content Domains

The first version focuses on Chinese content in these domains:

- Product management theory
- AI and large model knowledge
- Business frameworks
- Learning notes and article viewpoints

### Review Experience

The default home screen is "Today's Review".

The user sees a small daily queue, such as 10 to 15 questions. Each question is optimized for quick completion, usually within 10 to 20 seconds.

After answering, the user sees:

- Correct or incorrect feedback
- A concise explanation
- The related knowledge point
- A source reference

### Question Types

The MVP prioritizes these question types:

- Scenario judgment questions
- Multiple choice questions
- True or false questions
- Concept distinction questions

Scenario judgment questions should be preferred when the source material supports them, because product theory and AI knowledge are often better tested through application context than through definition recall.

### Management

The MVP includes only lightweight management:

- Topic grouping
- Weak point list
- Wrong question review
- Source history

The MVP does not include complex tagging, knowledge graph visualization, public sharing, team collaboration, or export-heavy workflows.

## Main Screens

### Today's Review

This is the default home screen.

The screen shows today's question count, progress, and one question card at a time. The user can answer quickly, see feedback, and continue.

The design goal is to create a daily habit: open the app, complete a few minutes of retrieval practice, and close it.

### Feed

The feed screen works like a lightweight chat window.

The user can send:

- Text
- Screenshots
- Links

Each feed item has a processing state:

- Processing
- Questions generated
- Needs confirmation
- Failed

The user does not need to manually choose categories before feeding content. The agent should infer topics and ask for clarification only when necessary.

### Weak Points

This screen shows recently missed or unstable knowledge points.

It should be focused and small. It is not a full knowledge library. Its job is to help the user quickly identify what needs reinforcement.

### Sources

This screen preserves the original content sources.

The user can return from a question to the original source snippet, screenshot, or link. This creates trust in generated questions and helps with deeper review when needed.

## Agent Processing Flow

### 1. Content Parsing

The agent parses incoming content based on type:

- Screenshots and images go through OCR.
- Links are converted into readable article text when possible.
- Pasted text is segmented directly.

The system records source title, source type, timestamp, and original content.

### 2. Knowledge Extraction

The agent extracts three types of knowledge:

- Core concepts
- Key judgments
- Applicable scenarios and counterexamples

For example, from content about RAG, the agent might extract:

"RAG helps solve knowledge update and factual retrieval problems, but it does not give the model true long-term memory."

### 3. Question Generation

Each extracted knowledge point can generate one to three questions.

Each question must include:

- Question stem
- Options when applicable
- Correct answer
- Explanation
- Source reference
- Related knowledge point
- Difficulty or confidence score

### 4. Quality Control

The agent should reject or revise questions that:

- Are too easy or purely literal
- Have ambiguous answers
- Cannot be supported by the source
- Depend on unsupported outside assumptions
- Duplicate existing questions too closely

Only usable questions should enter the review pool.

### 5. Review Scheduling

The system assigns each question or knowledge point a learning state:

- New
- Familiar
- Unclear
- Wrong
- Repeatedly wrong
- Mastered

Scheduling can start with a simple interval model:

- Wrong: review soon
- Unclear: review tomorrow
- Correct but new: review in a few days
- Repeatedly correct: review later

The scheduling model can become more sophisticated later, but the MVP should keep it explainable and easy to tune.

## Data Model

The MVP can be structured around four core objects:

### Source

Original user-fed content.

Fields include:

- ID
- Type: text, image, link
- Raw content or file reference
- Extracted text
- Title
- Created time
- Processing status

### Knowledge Point

An extracted unit of meaning.

Fields include:

- ID
- Source ID
- Topic
- Summary
- Key claim
- Scenario or counterexample when available
- Confidence score

### Question

A reviewable item generated from a knowledge point.

Fields include:

- ID
- Knowledge point ID
- Type
- Stem
- Options
- Correct answer
- Explanation
- Difficulty
- Quality status

### Review Record

The user's interaction history.

Fields include:

- ID
- Question ID
- User answer
- Correctness
- Response time
- Review timestamp
- Next review time
- Learning state

## Success Criteria

The MVP is successful if:

- A user can feed content in under 10 seconds.
- The system can generate usable review questions without manual organization.
- The user can complete 10 to 15 questions in about 3 minutes.
- The user feels the questions help them remember personally collected knowledge.
- Wrong or unclear knowledge reappears in later sessions.

## Non-Goals

The MVP will not include:

- Public question banks
- Team collaboration
- Deep platform integrations
- Complex knowledge graph views
- Heavy note-taking workflows
- Full article summarization as the main experience
- Export-first workflows

## Future Extensions

After the MVP proves the habit loop, the product can expand into:

- Mobile share sheet integration
- Browser extension
- WeChat-style agent feed
- More advanced spaced repetition
- Personalized weak point reports
- Weekly knowledge digest
- Conversational coaching
- Multi-modal source understanding
- Knowledge collections for specific learning goals

## Open Product Questions

These questions should be resolved before implementation:

- Should the first prototype be mobile-first, web-first, or a chat bot first?
- Should the user be able to edit generated questions?
- How much manual confirmation is acceptable before questions enter review?
- Should review scheduling operate at the question level or knowledge point level first?
- What is the first source type to optimize: text, screenshot, or link?

