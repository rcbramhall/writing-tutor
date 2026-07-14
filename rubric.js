// UO WR121 Essay Assessment Rubric (source: pacificnorthwestwriting.wordpress.com),
// adapted for WR122 by generalizing "the assigned common reading" to "assigned/researched sources."

const RUBRIC_TRAITS = [
  {
    key: "thesis",
    name: "Thesis, Focus, and Purpose",
    description:
      "Compose thesis statements with a focus appropriate to essays and maintain focus throughout; meet assigned topic and purpose for writing.",
    levels: {
      Exemplary:
        "Asserts a clear, sophisticated, arguable thesis that can be reasonably developed in the assigned length; remains focused on the thesis throughout in an immediately recognizable way; meets the assigned topic and purpose.",
      Skilled:
        "Asserts a clear, arguable thesis that can be reasonably developed in the assigned length; remains largely focused on the thesis; meets the assigned topic and purpose.",
      Developing:
        "States a thesis that may not be clear or arguable, or that cannot be reasonably developed in the assigned length; occasionally strays from the thesis; takes inappropriate liberties with the assigned topic and purpose.",
      Undeveloped:
        "Does not state a thesis, or states a thesis the writer later abandons; frequently strays from the thesis or discusses a different thesis entirely; may not meet the assigned topic and purpose."
    }
  },
  {
    key: "reasoning",
    name: "Reasoning and Support",
    description:
      "Support ideas through logical reasoning, source integration and analysis, and other appropriate evidence.",
    levels: {
      Exemplary:
        "Thoroughly supports the thesis with a rich variety of evidence; consistently uses reasoning to reach logical conclusions; significantly engages assigned/researched sources; accurately and effectively summarizes, paraphrases, and quotes relevant source material and analyzes all of it; considers and convincingly responds to varying claims.",
      Skilled:
        "Sufficiently supports the thesis using some variety of evidence; uses reasoning to reach logical conclusions; engages assigned/researched sources; summarizes, paraphrases, and quotes relevant source material in a largely accurate way with some analysis; considers varying claims and offers some response.",
      Developing:
        "Provides some evidence to support the thesis, but lacks variety or more is needed; conclusions may not always be based on logical reasoning; includes but does not adequately engage assigned/researched sources; source material has some accuracy issues, may not be entirely relevant or analyzed; does not adequately consider or respond to varying claims.",
      Undeveloped:
        "Provides insufficient evidence to support the thesis; conclusions are mostly not based on logical reasoning; does not include required sources; source material is inaccurately represented or irrelevant to the argument; lacks analysis of source material; lacks consideration of varying claims."
    }
  },
  {
    key: "organization",
    name: "Organization",
    description: "Construct an easy-to-follow, logical progression of ideas and information.",
    levels: {
      Exemplary:
        "Presents a logical progression of ideas based on the thesis; maintains focus within each paragraph; uses a highly effective title, introduction, and conclusion; provides clear, directive topic sentences and sophisticated transitions; includes logical paragraph breaks.",
      Skilled:
        "Presents a largely logical progression of ideas based on the thesis; maintains focus within most paragraphs; uses a satisfactory title, introduction, and conclusion; mostly provides topic sentences and has basic transitions; includes largely logical paragraph breaks.",
      Developing:
        "Relies on a progression of ideas that is not entirely logical and/or not always related to the thesis; loses focus within some paragraphs; introduction/conclusion may be limited or title missing; occasionally provides topic sentences and uses transitions inconsistently; paragraph breaks may not always be logical.",
      Undeveloped:
        "Progression of ideas is not logical and/or not based on the thesis; does not maintain focus within paragraphs; title, introduction, and/or conclusion may be limited or missing; largely fails to provide topic sentences and either omits transitions or uses ineffective ones; does not use logical paragraph breaks."
    }
  },
  {
    key: "citation",
    name: "Signal Phrasing and MLA Citation",
    description: "Employ signal phrasing and MLA citation methods to introduce and document sources ethically.",
    levels: {
      Exemplary:
        "Thoroughly integrates source material with varied and effective signal phrasing; maintains strict ethical standards and avoids plagiarism through correct, precise paraphrasing, quotation marks, in-text citations, and an MLA works cited page; uses direct quotes sparingly and to good effect.",
      Skilled:
        "Integrates most source material with signal phrasing; avoids plagiarism through competent paraphrasing and use of quotation marks, with mostly correct in-text citations and an MLA works cited page; relies somewhat too much on direct quotes.",
      Developing:
        "Largely lacks clear signal phrasing; includes some weak paraphrasing, errors in quotation mark use, and/or errors in in-text citations or the works cited page; uses direct quote where paraphrase or summary would be more appropriate.",
      Undeveloped:
        "Lacks signal phrasing; weak or inadequate paraphrasing and/or significant errors in quotation mark use; significant errors in in-text citations and/or works cited page, or lacks one or both; might be unintentionally plagiarizing because of these weaknesses; might rely on direct quotation to the exclusion of paraphrase and summary."
    }
  },
  {
    key: "voice",
    name: "Voice & Style",
    description: "Uses vocabulary and sentence structure appropriate to a college-level audience and purpose.",
    levels: {
      Exemplary:
        "Effectively engages an academic audience; employs varied sentence structures for style and reader interest; exhibits precise, sophisticated vocabulary.",
      Skilled:
        "Targets an academic audience; uses varied sentences but may occasionally repeat structures/lengths; largely effective word choice with some misuse, repetition, or minimal slang/cliché.",
      Developing:
        "Does not consistently engage an academic audience; some lack of control over sentence structures (repetitive or needlessly complex syntax); vocabulary may be imprecise, repetitive, and/or reliant on slang and cliché.",
      Undeveloped:
        "Lacks awareness of an academic audience; lacks control of sentence structures, relying on careless or received patterns; imprecise, simplistic vocabulary, possibly deceptive/inflammatory language, heavily reliant on slang and cliché."
    }
  },
  {
    key: "conventions",
    name: "Writing Conventions and MLA Page Layout",
    description: "Use conventions of standard written English and page layout to facilitate reading.",
    levels: {
      Exemplary:
        "No serious patterns of error; consistent point of view and appropriate tense; very few syntax/grammar/punctuation mistakes, none interfering with meaning; correctly uses MLA page layout standards.",
      Skilled:
        "May display patterns of error that do not interfere with meaning; rarely strays from consistent point of view/tense; occasional syntax/grammar/punctuation mistakes, not enough to significantly interfere with meaning; largely correct MLA page layout with few mistakes.",
      Developing:
        "Displays patterns of error that distract or sometimes interfere with meaning; tends to stray from consistent point of view/tense; significant syntax/grammar/punctuation mistakes make meaning unclear at points; approaches but doesn't fully achieve correct MLA page layout.",
      Undeveloped:
        "Serious patterns of error that substantially interfere with meaning; lacks control over point of view and tense; does not show mastery of standard written English conventions; does not display knowledge of MLA page layout standards."
    }
  }
];

function renderRubricForPrompt() {
  return RUBRIC_TRAITS.map((trait) => {
    const levelLines = Object.entries(trait.levels)
      .map(([level, desc]) => `    - ${level}: ${desc}`)
      .join("\n");
    return `- ${trait.name} — ${trait.description}\n${levelLines}`;
  }).join("\n\n");
}

function buildSystemPrompt(courseLevel) {
  const courseContext =
    courseLevel === "WR122"
      ? "This is a WR122 assignment (research-based argumentative writing, typically drawing on multiple independently found sources rather than a single assigned common reading)."
      : "This is a WR121 assignment (argumentative essay typically built around a required common reading, minimum three pages).";

  return `You are a writing tutor supporting a student in University of Oregon's WR121/WR122 composition sequence. ${courseContext}

You evaluate essays against this official rubric (six traits, each with four performance levels: Exemplary, Skilled, Developing, Undeveloped):

${renderRubricForPrompt()}

YOUR ROLE — coach, not editor:
- HARD RULE: never produce a sentence, phrase, thesis statement, transition, or citation that is phrased as something the student could copy into their essay — including when framed as "for example," "you might say," "something like," "a revised version might look like," or any other hedge. If you catch yourself about to write a quotable replacement string, stop and ask a question instead. There is no exception for "short" or "just illustrative" examples.
- Instead: name what the rubric calls for, explain in your own words what you observe in THIS essay relative to that standard, and ask targeted questions that lead the student to revise it themselves (e.g. "Which sentence in your intro states your claim? Could a reader disagree with it?").
- If the student directly asks you to write or rewrite something for them, decline warmly, restate why (it's their essay, and revising it themselves is how the skill is learned), and redirect with a coaching question instead — do not soften the decline by then providing an example anyway.
- Before sending any reply, check it yourself: does it contain a full clause or sentence the student could paste directly into their draft? If yes, remove it and replace it with a question or a description of the gap instead.
- Be specific to their essay — reference their actual paragraphs, claims, and sources by describing them, not by quoting long passages back verbatim (short quotes under ~8 words are fine to point at a specific spot).
- Keep tone encouraging, concrete, and college-level appropriate. Avoid vague praise ("good job!") — tie feedback to rubric language.

CITATION REVIEW — give this real attention:
- For each cited source, check: (1) Is it introduced with a signal phrase (e.g., naming the author/source before or around the quote/paraphrase)? (2) Is it in correct MLA in-text citation format (author-page, or appropriate variant)? (3) Is there a correctly formatted MLA works cited entry for it? (4) Is a direct quote used where paraphrase/summary would serve better, or vice versa? (5) MOST IMPORTANTLY: does the cited material actually support the specific claim the student is making at that point in the paragraph, or is it a loosely related quote dropped in without analysis connecting it to the argument?
- Flag relevance problems explicitly — a correctly formatted citation that doesn't support the claim is still a problem worth coaching on.
- Do not rewrite the student's citations or draft correct MLA formatting for them; explain what's off and point them to how to check/fix it (e.g. "compare your in-text citation to the MLA author-page format — what's missing here?").

Ground every piece of feedback in the rubric traits above. Where you estimate a performance level for a trait, treat it as a formative, non-final estimate to guide revision — make clear this is not the instructor's official grade.`;
}

const ANALYSIS_TOOL = {
  type: "function",
  function: {
  name: "submit_rubric_analysis",
  description: "Submit a structured rubric-based coaching analysis of the student's essay.",
  parameters: {
    type: "object",
    properties: {
      overallImpression: {
        type: "string",
        description:
          "2-4 sentence coach-voice overview of the essay's current state and the single most important thing to work on next. No rewritten text."
      },
      traits: {
        type: "array",
        description: "One entry per rubric trait, in the order given in the rubric.",
        items: {
          type: "object",
          properties: {
            key: { type: "string", enum: RUBRIC_TRAITS.map((t) => t.key) },
            levelEstimate: {
              type: "string",
              enum: ["Exemplary", "Skilled", "Developing", "Undeveloped"]
            },
            strengths: {
              type: "array",
              items: { type: "string" },
              description: "1-3 specific things the essay does well for this trait, referencing the essay's actual content."
            },
            growthAreas: {
              type: "array",
              items: { type: "string" },
              description: "1-3 specific gaps relative to the rubric's higher levels for this trait."
            },
            coachingQuestions: {
              type: "array",
              items: { type: "string" },
              description: "1-3 Socratic questions aimed at this essay specifically, to prompt the student's own revision."
            }
          },
          required: ["key", "levelEstimate", "strengths", "growthAreas", "coachingQuestions"]
        }
      },
      citationReview: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "2-3 sentence overview of citation practice across the essay."
          },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                location: {
                  type: "string",
                  description: "Brief description of where in the essay, e.g. 'paragraph 3, quote about ocean acidification'."
                },
                issue: {
                  type: "string",
                  description: "What's wrong: missing signal phrase, incorrect MLA format, missing works-cited entry, over-reliance on direct quotes, or the quote/paraphrase not actually supporting the claim."
                },
                question: {
                  type: "string",
                  description: "A coaching question to prompt the student to fix it themselves."
                }
              },
              required: ["location", "issue", "question"]
            }
          },
          noSourcesDetected: {
            type: "boolean",
            description: "True if the essay appears to contain no cited source material at all."
          }
        },
        required: ["summary", "issues", "noSourcesDetected"]
      },
      nextSteps: {
        type: "array",
        items: { type: "string" },
        description: "3-5 prioritized, most-impactful-first revision moves, phrased as tasks/questions, not rewritten text."
      }
    },
    required: ["overallImpression", "traits", "citationReview", "nextSteps"]
  }
  }
};

module.exports = { RUBRIC_TRAITS, buildSystemPrompt, ANALYSIS_TOOL };
