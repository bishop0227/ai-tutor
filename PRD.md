# Product Requirements Document (PRD): Adaptive AI Tutor

## 1. Product Overview
The **Adaptive AI Tutor** is a web-based intelligent study partner designed specifically for college students. Unlike generic PDF readers, this platform understands the specific context of a university course by analyzing the Syllabus (lecture plan) first. It provides customized learning experiences (explanations, summaries, or advanced problems) based on the user's learning style and continuously tracks academic weaknesses through intelligent quizzes and reports to ensure grade improvement.

## 2. Product Vision
### Purpose & Problem Statement
**The Problem:**
College students often face "academic paralysis" when dealing with vast amounts of major-specific materials. They struggle with:
1.  **Lack of Understanding:** Difficulty grasping complex concepts during self-study.
2.  **Scope Ambiguity:** Inability to determine what is important for exams.
3.  **Lack of Meta-cognition:** Not knowing what they don't know until they fail the exam.

**The Solution:**
A personalized AI platform that acts as a private tutor. By "pre-training" the AI with the course Syllabus, it aligns all subsequent PDF materials with the professor's learning objectives. It creates a feedback loop of **Learn → Quiz → Diagnose → Plan**, ensuring efficient study management.

**Value Proposition:**
- **Context-Aware:** Explanations are not generic; they are tied to the specific course curriculum.
- **Adaptive:** The difficulty adjusts based on the user's identified weaknesses.
- **Actionable:** Converts passive reading into active testing and planning.

## 3. Reference Service Analysis

| Service Name | Key Feature Referenced | Reason for Reference |
| :--- | :--- | :--- |
| **ChatPDF** | **RAG-based PDF Interaction** | Their UX for uploading a document and immediately asking questions is intuitive. We adopt this for the core study interface but add the "Syllabus Context" layer on top. |
| **Quizlet** | **Gamified Testing & Flashcards** | Their method of repetitive testing to reinforce memory is highly effective. We reference their quiz UI but upgrade the content generation to handle complex university-level engineering/science problems. |

## 4. Key Features & Detailed Specifications

### 4.1. Learning Style Onboarding
*   **Why:** To tailor the AI's tone, depth of explanation, and problem generation style to the user.
*   **How:**
    *   Upon first sign-up, the user completes a survey.
    *   **Data Points:** Learning Style (Cramming vs. Deep Understanding), Exam Prep Method (Concept-first vs. Problem-first).
    *   **Benefit:** A "Crammer" gets bullet points; a "Deep Learner" gets derivations and proofs.

### 4.2. Subject Context Injection (Syllabus Integration)
*   **Why:** Generic AI doesn't know what the professor emphasizes. Uploading the syllabus sets the "Ground Truth" for the course.
*   **How:**
    *   User creates a "Subject" (e.g., Calculus 1) and uploads the Syllabus/OT material.
    *   System extracts: Course Goals, Weekly Curriculum, Grading Criteria.
    *   **Benefit:** The AI knows that for "Week 11," the focus is "Infinite Sequences," ensuring relevant answers.

### 4.3. Adaptive Concept Learning (Mode Selection)
* **Why:** Users have varying needs depending on their knowledge level and study phase (e.g., deep understanding vs. quick review).
* **How:**
    * **3-Mode Selection:** User selects or switches modes dynamically:
        * *Summary Mode:* High-level structure and key takeaways for quick review.
        * *Deep Dive Mode:* Comprehensive academic breakdown, derivations, and definitions.
        * *ELI5 Mode:* Intuitive explanations using analogies and simple language (Explain Like I'm 5).
    * **Smart Resource Linking:** When concepts are complex, the AI provides curated links to relevant web articles and YouTube videos.
    * **Benefit:** Maximizes learning efficiency by matching the explanation style to the user's immediate cognitive state, reducing external search time.

### 4.4. Intelligent Quiz & Weakness Report
* **Why:** To fix meta-cognition errors (thinking one understands when they don't) and shift from passive reading to active retrieval.
* **How:**
    * **Context-Aware Generation:** Generates problems tailored to the specific domain of the PDF (e.g., calculation problems for Calculus, cause-and-effect for History).
    * **Weakness Report & Link-Back:** Analyzes error patterns and provides a direct "Review Concept" button to jump back to the relevant explanation in section 4.3.
    * **Feedback Loop:** Quiz performance updates the User Profile to customize the difficulty and tone of future concept explanations.
    * **Benefit:** Pinpoints exact knowledge gaps and provides an immediate, actionable path for review before the actual exam.

### 4.5. AI Study Planner
*   **Why:** Students struggle to estimate how long studying will take.
*   **How:**
    *   **Input:** Exam date and target range (e.g., Chapters 1-5).
    *   **Calculation:** AI analyzes the volume of text/difficulty and the user's historical learning speed.
    *   **Output:** A realistic daily schedule (e.g., "Day 1: Read Ch.1 & Quiz").
    *   **Benefit:** Reduces anxiety by providing a manageable roadmap.

## 5. Proposed Additional Features
1.  **Peer Insight (Anonymous Data):**
    *   *Description:* Show "Questions other students asked about this PDF."
    *   *Why:* Helps users discover blind spots they hadn't thought of.
2.  **Voice Mode (TTS/STT):**
    *   *Description:* Allow users to ask questions verbally and listen to explanations while commuting.
    *   *Why:* maximizes time utilization for busy students.

## 6. Target User Persona

| Persona | Characteristics | Goals | Pain Points |
| :--- | :--- | :--- | :--- |
| **Jihoon (The Struggler)** | Freshman, Engineering Major. "I don't get it at all." | Understand basic concepts to pass the course. | Lecture moves too fast; textbooks are too hard. Needs step-by-step breakdown. |
| **Minji (The Efficient)** | Sophomore, Liberal Arts. "I need to maximize GPA with min. effort." | Memorize key points quickly before exams. | Too much reading material. Needs summaries and key term extraction. |
| **Hyunjin (The High Achiever)** | Junior, Science Major. "I want an A+." | Solve high-difficulty application problems. | Standard materials are too easy. Needs challenging edge-cases and deeper logic. |

## 7. User Scenario
**Scenario: Recovering from a mid-semester slump in Calculus**

1.  **Onboarding:** Jihoon, a freshman in Mechanical Engineering, signs up. He sets his profile to "Deep Understanding" because he is failing *Calculus 1*.
2.  **Context Setup:** He creates a "Calculus 1" folder and uploads the professor's Syllabus. The AI analyzes it and understands the course structure.
3.  **Learning:** In Week 11, he uploads the "Infinite Sequences and Series" PDF. He selects "Explanation Mode." The AI explains the concept simply and provides a link to a specific YouTube tutorial for visualization.
4.  **Testing:** Jihoon asks for "Easy Subjective Problems." Instead of generic text questions, the AI generates specific math problems related to the PDF.
5.  **Feedback:** Jihoon solves them but gets the 'Comparison Test' question wrong. The AI generates a **Weakness Report**: "You are confusing the Limit Comparison Test with the Direct Comparison Test."
6.  **Loop:** The AI saves this data. Next time Jihoon quizzes himself, the AI deliberately includes more Comparison Test variations.
7.  **Planning:** With the final exam 2 weeks away, Jihoon asks for a plan. The AI generates a schedule: "Review Series (Day 1-2) due to past weakness, Review Integrals (Day 3)..." helping him study efficiently.

## 8. Tech Stack Recommendations

To ensure rapid prototyping while maintaining scalability for the intelligent features, the following stack is recommended:

*   **Frontend (Web):**
    *   **React + Vite:** For a fast, responsive Single Page Application (SPA).
    *   **TypeScript:** To ensure type safety, crucial for handling complex API responses (JSON data for quizzes/reports).
    *   **Tailwind CSS:** For rapid UI development.

*   **Backend (API):**
    *   **Python Flask:** Lightweight and excellent for integrating with AI libraries.
    *   **LangChain:** To manage the flow between the PDF content, the Syllabus context, and the LLM.

*   **AI & Model:**
    *   **LLM:** **OpenAI GPT-4o** (Essential for handling multi-modal tasks like interpreting math symbols and generating high-quality logic).
    *   **RAG (Retrieval-Augmented Generation):**
        *   **Embeddings:** OpenAI `text-embedding-3-small` or `3-large`.
        *   **Vector Search:** FAISS (for local dev) or Pinecone/ChromaDB (for production). This is critical to search specific parts of the PDF.

*   **Database:**
    *   **SQLite (Prototype):** Simple to set up for storing User Profiles, Quiz History, and Weakness Logs.
    *   **PostgreSQL (Production):** Migration target for better concurrency and JSON capabilities later.

*   **PDF Parsing:**
    *   **PyPDF2 or PDFMiner:** To extract text.
    *   **MathPix API (Optional):** If the engineering PDFs contain heavy mathematical notation that standard parsers miss.