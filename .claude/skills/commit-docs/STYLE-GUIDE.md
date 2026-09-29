# Technical Writing Style Guide

Condensed reference for `commit-docs`. Apply every rule below to generated entries. When a rule and a habit conflict, the rule wins.

## Language

Use US English: color, center, behavior — not colour, centre, behaviour.

## Sentence structure

- **Important information first.** State the purpose before the action, so a reader who doesn't need the purpose can skip it.
  - Bad: "To enable quick integration with third-party tools, Proxmox VE offers a RESTful API."
  - Good: "Proxmox VE offers a RESTful API to enable quick integration with third-party tools."
  - Bad: "Click Delete if you want to delete the entire document."
  - Good: "To delete the entire document, click Delete."
- **Sentence length.** Average 15–20 words. Vary length and openings. A sentence listing three or more items works better as a bullet list.
- **Transitions.** Use connecting words to clarify relationships between ideas (for example, however, therefore, in other words, first/next/then). Don't leave ideas floating unconnected.

## Procedures

Use this format for any step-by-step instruction (setup, configuration, workflow changes):

- Give the procedure a heading, phrased consistently with other procedure headings (e.g., "Closing the Program").
- An introductory sentence may add context without repeating the heading: "To do X, follow these steps:"
- **Single step:** use a bullet, not a numbered list.
- **Multiple steps:** number them. Sub-steps get lowercase letters (a, b, c); sub-sub-steps get lowercase roman numerals (i, ii, iii).
- Each step names one clear action in the imperative ("Click Save," not "You should click Save" or "Saving is done by...").
- If the reader must press Enter/Return after a step, fold that into the same step: "Type the value and press Enter" — not a separate step.
- State the purpose before the action: "To start a new document, click File > New > Document" — not "Click File > New > Document to start a new document."

## Concise communication

Write to inform, not to impress. Avoid elaborate prose, padding, and verbosity — most readers are non-native English speakers. Every word should earn its place.

## Active voice

Default to active voice: actor, verb, object. Passive voice ("was edited by," "were made") hides the actor and reads longer.

- Passive: "The file is edited by the administrator." → Active: "The administrator edits the file."
- Passive: "This module was written by various contributors." → Active: "Various contributors wrote this module."
- Tell: sentences containing "by," or past-participle verb forms ("was eaten," "is driven"), are usually passive.

## Person and mood

- **Third-person indicative** for descriptions — introducing a feature, explaining what a commit changes and why. Don't address the reader directly. Never use "one" as a pronoun (too formal/UK).
  - Example: "The build script writes the bundle to `dist/`."
- **Second-person imperative** for instructions — telling the reader what to do. "You" is fine in general description; it simplifies sentences. Avoid modal verbs (should, could, might) in instructions.
  - Example: "Insert the memory card into the card slot." / "To create a container, run..." (not "You can create a container by...")
- **Avoid first person.** Never use "I." Avoid "we" where possible — don't write "we implemented X"; write "X now supports Y." Exception: "we recommend" is fine when the alternative phrasing gets clumsy.

## Headings

- **H1 and H2** (the document title and top-level sections): title-style capitalization — capitalize first, last, and all major words; lowercase articles (a, an, the) and short prepositions/conjunctions (on, to, in, of, for, and, or, but) unless first or last word.
  - Example: "How to Install Proxmox VE," "Monitoring and Operating a Cluster"
- **H3 and deeper:** sentence-style capitalization — capitalize only the first word and proper nouns.
  - Example: "Network: Setup and configuration"

## Punctuation

- **Oxford comma:** always use it in a list of three or more ("dancers, John, and David").
- Comma before a coordinating conjunction (and, but, for, or, nor, so, yet) joining two independent clauses: "I went running, and I saw a duck." No comma when the subject isn't repeated: "I went running and saw a duck."
- Comma after an introductory phrase, adverb, or sequence word: "First, pour the milk." "With the app, you can call any phone."
- Comma after a dependent clause that opens a sentence: "When I went running, I saw a duck."
- No comma to splice two independent clauses without a conjunction — use a semicolon instead.
- No comma between two verbs sharing one subject: "The script builds the site and deploys it."
- **Slashes** imply combination, not "or": "client/server," "TCP/IP." Don't use a slash to mean "or" — write it out.
- **Hyphens:** hyphenate compound modifiers before a noun when ambiguity is otherwise possible ("read-only memory"), when one word is a participle used as a modifier ("well-defined schema"), or when the modifier is a number/letter plus noun ("5-point star"). Hyphenate compounds with an abbreviated word ("e-book") but not "email."
- **Em dashes** (—) set off a parenthetical with more emphasis than parentheses. No spaces around them.

## Lists

Pull three or more same-kind items out of running text into a list. Bullets for unordered options; numbers for sequence-dependent steps. Keep list items short and parallel. Don't mix punctuated full sentences with unpunctuated fragments in the same list — pick one style and hold it.

## Avoid jargon and slang

Use the plain, familiar term over jargon or an idiom when one exists (e.g., "symbol" over "glyph").

## Consistency

Pick one term for a concept and stick with it throughout a document. If a synonym is common, introduce it once in parentheses on first use, then drop it.

## Contractions

Common contractions (it's, you're, don't) are fine in prose. Never contract a verb with a noun: "Proxmox's the leading..." is wrong; write "Proxmox is the leading..."

## Abbreviations

Avoid lazy abbreviations ("approx.," "etc."). Spell out "approximately." Avoid "etc." entirely, especially after "such as," which already implies an incomplete list.

## e.g. / i.e.

Avoid both. Write "for example" or "for instance" instead of "e.g.," and "that is" or "in other words" instead of "i.e."

## Acronyms

Spell out an acronym on first use with the abbreviation in parentheses, and only if it's used again later in the same document: "Kernel Samepage Merging (KSM)." Well-known abbreviations (USB, HTML, URL, API, CLI) don't need spelling out.

## Capitalization

Capitalize the first word of a sentence and all proper nouns (names, products, days, months, holidays, cities, countries, languages). Don't capitalize seasons.

## A / an

Use "an" before a vowel *sound*, "a" before a consonant *sound* — go by pronunciation, not spelling: "an hour," "a European," "a unit."

## Gender

Use "they/them/their" as the gender-neutral pronoun. Rephrase to drop the pronoun entirely, or switch to second-person imperative, if a sentence reads awkwardly.

## Data

Treat "data" as singular ("the data shows...").

## What to never fabricate

State only what the commit message, diff, and linked PR/issue actually show. Don't invent a rationale, a "why," or a business justification the source material doesn't support — describe what changed and, if evident, what problem it solves; leave speculation out.
