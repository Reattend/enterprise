import React from 'react'

/* -- Shared prose components -- */
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-[15px] leading-relaxed text-gray-600 mb-5">{children}</p>
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[20px] font-bold text-[#1a1a2e] mt-10 mb-4">{children}</h2>
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[17px] font-semibold text-[#1a1a2e] mt-8 mb-3">{children}</h3>
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 space-y-2 text-[15px] text-gray-600 mb-5">{children}</ul>
}

function OL({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal pl-5 space-y-2 text-[15px] text-gray-600 mb-5">{children}</ol>
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-[#1a1a2e]">{children}</strong>
}

/* -- Use case page content -- */

export const USE_CASE_CONTENT: Record<string, React.ReactNode> = {

  /* ================================================================== */
  'meeting-memory': (
    <>
      <H2>The problem: meetings happen, knowledge disappears</H2>
      <P>
        Your team has meetings every day. Standups, planning sessions, one-on-ones, client calls.
        Important things get said. Decisions get made. Action items get assigned. And then what?
      </P>
      <P>
        The notes end up in a Google Doc nobody opens again. The action items live in someone's
        head. Two weeks later, nobody remembers what was decided or why.
      </P>
      <P>
        This is not a note-taking problem. It is a memory problem. Your team generates knowledge
        in meetings, but that knowledge evaporates because there is no system to capture and
        connect it.
      </P>

      <H2>How Reattend solves this</H2>
      <P>
        Reattend turns meeting output into lasting, searchable knowledge. Instead of notes that
        rot in a folder, you get memories that stay connected to your team's work.
      </P>

      <H3>Capture meeting outcomes in seconds</H3>
      <P>
        After a meeting, dump your notes into Reattend's inbox. It does not matter if they are
        messy, incomplete, or shorthand. Reattend's AI reads your notes and extracts the
        important parts: decisions made, action items assigned, context discussed, and key
        takeaways.
      </P>

      <H3>AI organizes everything automatically</H3>
      <P>
        Reattend's triage agent categorizes each piece of information as the right memory type.
        A decision becomes a Decision memory. An action item becomes a Task. Background context
        becomes an Insight or Note. You do not have to think about where things go.
      </P>

      <H3>Linked to everything else</H3>
      <P>
        This is where Reattend is different from a note-taking app. Every meeting memory gets
        automatically linked to related decisions, past meetings, project context, and team
        knowledge. When you look at a meeting outcome six months later, you can see exactly
        what led to it and what happened after.
      </P>

      <H3>Search across all meetings</H3>
      <P>
        Need to find what was decided about the pricing model? Search for it. Reattend's
        semantic search understands what you mean, not just what you type. You can search by
        topic, person, project, or date range and find the answer in seconds.
      </P>

      <H2>What this looks like in practice</H2>
      <OL>
        <li><Strong>After a meeting</Strong>, paste your notes (or forward the recap email) into Reattend's inbox.</li>
        <li><Strong>AI triage</Strong> extracts decisions, action items, and context into separate, typed memories.</li>
        <li><Strong>Automatic linking</Strong> connects these memories to related projects, past decisions, and team knowledge.</li>
        <li><Strong>Anyone on the team</Strong> can search or ask AI about what happened in any meeting, anytime.</li>
      </OL>

      <H2>Why this matters</H2>
      <P>
        Teams that capture meeting knowledge effectively make better decisions, move faster,
        and waste less time in "didn't we already discuss this?" conversations. The knowledge
        from your meetings is some of the most valuable your team produces. It deserves a
        better home than a forgotten Google Doc.
      </P>
    </>
  ),

  /* ================================================================== */
  'decision-tracking': (
    <>
      <H2>The problem: decisions get made and then forgotten</H2>
      <P>
        Every team makes dozens of decisions each week. Which approach to take. What to
        prioritize. How to handle a customer issue. Who owns what. These decisions get made in
        meetings, Slack threads, and email chains. And then they vanish.
      </P>
      <P>
        Three weeks later, someone asks "why did we go with option B?" Nobody remembers. Or
        worse, someone remembers differently than what actually happened. The team re-discusses
        the decision, wastes an hour, and maybe arrives at a completely different conclusion.
      </P>
      <P>
        This is not a communication problem. It is a decision memory problem. Your team needs
        a system that records decisions along with the context and reasoning behind them.
      </P>

      <H2>How Reattend solves this</H2>
      <P>
        Reattend gives your team a shared decision memory. Every decision is captured with its
        full context, linked to related work, and instantly searchable.
      </P>

      <H3>Capture decisions with full context</H3>
      <P>
        When a decision is made, drop it into Reattend. Include the options that were considered,
        the reasoning behind the choice, who was involved, and any constraints or trade-offs.
        Reattend's AI helps structure this information so it is clear and complete.
      </P>

      <H3>Automatic tagging and linking</H3>
      <P>
        Reattend identifies entities (people, projects, tools, concepts) in your decisions and
        tags them automatically. It also links decisions to related meetings, past decisions, and
        project context. When you look at a decision, you see the full picture.
      </P>

      <H3>Find any decision instantly</H3>
      <P>
        "What did we decide about the API versioning strategy?" Just search for it. Reattend's
        semantic search understands the intent behind your query. You do not need to remember
        the exact words that were used. The decision, its rationale, and its context come up
        immediately.
      </P>

      <H3>Ask AI about past decisions</H3>
      <P>
        Not sure what to search for? Ask Reattend's AI assistant. "What decisions have we made
        about pricing in the last three months?" or "Why did we choose PostgreSQL over MongoDB?"
        The AI pulls from your team's decision history and gives you a clear, sourced answer.
      </P>

      <H2>What this looks like in practice</H2>
      <OL>
        <li><Strong>A decision is made</Strong> in a meeting, Slack thread, or email chain.</li>
        <li><Strong>Someone captures it</Strong> in Reattend with the decision, rationale, and participants.</li>
        <li><Strong>AI enriches it</Strong> by tagging entities, linking to related decisions, and categorizing it.</li>
        <li><Strong>Months later</Strong>, anyone can search for or ask about the decision and get the full context.</li>
      </OL>

      <H2>The impact of good decision tracking</H2>
      <UL>
        <li><Strong>No more re-discussions.</Strong> When someone questions a past decision, the answer is right there.</li>
        <li><Strong>Faster onboarding.</Strong> New team members can understand the reasoning behind existing systems and processes.</li>
        <li><Strong>Better future decisions.</Strong> When you can see the pattern of past decisions and their outcomes, you make smarter choices.</li>
        <li><Strong>Less finger-pointing.</Strong> When decisions are documented with context, there is less room for "I thought we agreed on something else."</li>
      </UL>
    </>
  ),

  /* ================================================================== */
  'team-onboarding': (
    <>
      <H2>The problem: onboarding takes forever because knowledge is scattered</H2>
      <P>
        A new person joins your team. They need to understand how things work, why certain
        decisions were made, what the current priorities are, and who knows what. Where do they
        find this information?
      </P>
      <P>
        Usually, the answer is "ask around." They interrupt teammates with questions. They dig
        through wikis that were last updated eight months ago. They sit in meetings where people
        explain things for the fifth time. It takes weeks or months before they feel truly up
        to speed.
      </P>
      <P>
        The knowledge exists somewhere in your organization. It is just locked in people's heads,
        scattered across tools, and impossible for a new person to find.
      </P>

      <H2>How Reattend solves this</H2>
      <P>
        Reattend gives new team members access to your team's living memory from day one. Instead
        of asking around, they can search, browse, and ask AI about everything your team knows.
      </P>

      <H3>A searchable history of everything</H3>
      <P>
        Every decision, meeting outcome, project context, and team insight is captured in
        Reattend. New hires can search for any topic and find the relevant history, including
        the reasoning behind how things are done.
      </P>

      <H3>Ask AI instead of interrupting teammates</H3>
      <P>
        "Why do we use this architecture?" or "What happened with the Q3 redesign?" New team
        members can ask Reattend's AI assistant and get answers sourced from your team's actual
        knowledge. No need to schedule a call or wait for someone to respond on Slack.
      </P>

      <H3>Explore the knowledge graph</H3>
      <P>
        Reattend's memory graph shows how ideas, decisions, people, and projects are connected.
        New hires can visually explore your team's knowledge landscape to build a mental model
        of how everything fits together.
      </P>

      <H3>Project context at a glance</H3>
      <P>
        When a new hire is assigned to a project, they can see all the memories associated with
        it: past decisions, key discussions, technical context, and related work. Instead of
        piecing together information from five different tools, they get the full picture in one
        place.
      </P>

      <H2>What this looks like in practice</H2>
      <OL>
        <li><Strong>Day one</Strong>: new hire gets access to Reattend and browses the team's shared memory.</li>
        <li><Strong>First week</Strong>: they search for context on their assigned projects and ask AI about team processes.</li>
        <li><Strong>First month</Strong>: they contribute their own memories, adding to the shared knowledge base.</li>
        <li><Strong>Ongoing</Strong>: onboarding becomes self-serve because the knowledge is always there.</li>
      </OL>

      <H2>Why this matters</H2>
      <P>
        Fast onboarding is a competitive advantage. Teams that get new members productive quickly
        can move faster, hire more confidently, and scale without losing quality. And the best
        part: every memory your team captures for onboarding also benefits everyone else. It is
        not extra work. It is the natural byproduct of using Reattend as your shared memory.
      </P>
    </>
  ),

  /* ================================================================== */
  'remote-team-context': (
    <>
      <H2>The problem: remote teams lose context constantly</H2>
      <P>
        When your team works across time zones, information slips through the cracks. Someone
        makes a decision in a morning standup. By the time the team in another time zone wakes
        up, the context is buried in a Slack thread with 47 messages above it. They do not read
        all of it. They miss the nuance. They make assumptions.
      </P>
      <P>
        Remote and async-first teams face a unique challenge: the communication tools they rely
        on (Slack, email, video calls) are great for real-time conversation but terrible for
        preserving context over time. Messages scroll away. Meetings are not attended by everyone.
        Important context lives in DMs that nobody else can see.
      </P>

      <H2>How Reattend solves this</H2>
      <P>
        Reattend acts as a shared memory layer for your distributed team. It captures, organizes,
        and connects the knowledge that flows through your communication tools so everyone has
        access to the same context, regardless of time zone.
      </P>

      <H3>Capture context from anywhere</H3>
      <P>
        Forward important emails to Reattend. Copy key Slack messages into the inbox. Dump
        meeting notes after a call. Reattend's AI processes everything and turns it into
        structured, searchable memories.
      </P>

      <H3>Async-friendly by design</H3>
      <P>
        Reattend does not require real-time participation. Team members capture context when it
        happens. Others discover it when they need it. The knowledge persists and stays organized
        whether someone accesses it five minutes later or five months later.
      </P>

      <H3>AI connects the dots automatically</H3>
      <P>
        When a decision made in one time zone relates to a discussion that happened in another,
        Reattend links them together. Team members can follow the thread of reasoning across
        meetings, messages, and documents without having to piece it together manually.
      </P>

      <H3>Everyone gets the full picture</H3>
      <P>
        Instead of asking "what did I miss?" every morning, team members can check Reattend.
        Search for a topic. Browse recent memories. Ask AI for a summary of what happened
        yesterday. The context is always there.
      </P>

      <H2>What this looks like in practice</H2>
      <OL>
        <li><Strong>Morning in New York</Strong>: the team makes a decision about the product roadmap and captures it in Reattend.</li>
        <li><Strong>Morning in London</Strong>: a teammate searches Reattend, finds the decision with full context, and starts executing.</li>
        <li><Strong>Morning in Singapore</Strong>: another teammate asks AI "what changed on the roadmap yesterday?" and gets a clear answer.</li>
        <li><Strong>No one</Strong> had to repeat themselves. No one missed the context. No one made assumptions.</li>
      </OL>

      <H2>Why this matters for distributed teams</H2>
      <UL>
        <li><Strong>Fewer misunderstandings.</Strong> When everyone has access to the same context, there is less room for misinterpretation.</li>
        <li><Strong>Less repetition.</Strong> Stop explaining the same things in every time zone's standup.</li>
        <li><Strong>More autonomy.</Strong> Team members can find the information they need without waiting for someone else to be online.</li>
        <li><Strong>Better async communication.</Strong> When people can build on shared context, their async messages are clearer and more productive.</li>
      </UL>
    </>
  ),

  /* ================================================================== */
  'project-handoffs': (
    <>
      <H2>The problem: when people leave, knowledge leaves with them</H2>
      <P>
        Someone who has been leading a project for a year moves to a different team. Or leaves
        the company. What happens to everything they know?
      </P>
      <P>
        The technical decisions they made. The customer conversations that shaped the product.
        The trade-offs they considered. The things they tried that did not work. The context
        about why the code is structured a certain way. All of it lives in their head. And when
        they leave, it walks out the door with them.
      </P>
      <P>
        The person who takes over the project starts from scratch. They reverse-engineer decisions
        from code and documents. They repeat mistakes that were already made. They spend weeks
        building context that used to exist.
      </P>

      <H2>How Reattend solves this</H2>
      <P>
        Reattend preserves project knowledge continuously, not just at handoff time. When your
        team uses Reattend throughout a project, the full history of decisions, context, and
        reasoning is captured and organized automatically.
      </P>

      <H3>Project context is always captured</H3>
      <P>
        As your team works, decisions get logged, meeting outcomes get saved, and context gets
        recorded in Reattend. This happens naturally as part of the workflow, not as a special
        "documentation" effort. By the time a handoff happens, the knowledge is already there.
      </P>

      <H3>Full decision history</H3>
      <P>
        The new project owner can see every decision that was made, who made it, and why. They
        do not have to guess why the database was structured a certain way or why a feature was
        deprioritized. The rationale is captured alongside the decision.
      </P>

      <H3>Ask AI about project history</H3>
      <P>
        "Why did we choose this API design?" or "What were the main issues in the last sprint?"
        The new owner can ask Reattend's AI and get answers drawn from the project's full memory.
        It is like having a conversation with the project's history.
      </P>

      <H3>Linked knowledge graph</H3>
      <P>
        Reattend's memory graph shows how all project knowledge connects. The new owner can
        visually explore how decisions relate to each other, what conversations led to what
        outcomes, and how different aspects of the project fit together.
      </P>

      <H2>What this looks like in practice</H2>
      <OL>
        <li><Strong>Throughout the project</Strong>, the team captures decisions, meeting notes, and context in Reattend as they work.</li>
        <li><Strong>When a handoff happens</Strong>, the new owner has immediate access to the project's full memory.</li>
        <li><Strong>They explore</Strong> the decision history, search for specific context, and ask AI about anything unclear.</li>
        <li><Strong>Within days</Strong>, they have the context that used to take weeks or months to build.</li>
      </OL>

      <H2>The real cost of poor handoffs</H2>
      <P>
        Bad project handoffs are expensive. They slow down teams, lead to repeated mistakes,
        and create frustration for everyone involved. The cost compounds over time: every decision
        that gets re-made, every bug that gets re-introduced, every conversation that gets
        re-had adds up.
      </P>
      <P>
        Reattend does not just make handoffs easier. It makes them unnecessary in the traditional
        sense. When project knowledge lives in a shared memory that the whole team can access,
        there is no dramatic "handoff" moment. The knowledge is always shared. People come and
        go, but the memory stays.
      </P>
    </>
  ),

  /* ================================================================== */
  'knowledge-base': (
    <>
      <H2>The problem: traditional wikis and knowledge bases go stale</H2>
      <P>
        You have tried wikis. Confluence, Notion, Google Docs folders, README files, whatever
        your team uses. The story is always the same: someone creates the pages, the team uses
        them for a few weeks, and then they slowly drift out of date. Six months later, half
        the information is wrong and nobody trusts it.
      </P>
      <P>
        The reason is simple: maintaining a traditional knowledge base is extra work. Someone
        has to write the documentation. Someone has to update it when things change. Someone has
        to organize it so others can find things. That "someone" is usually already busy with
        their actual job.
      </P>
      <P>
        The result is a knowledge base that is either outdated, incomplete, or both. People
        stop using it. They go back to asking on Slack. The investment in documentation is wasted.
      </P>

      <H2>How Reattend is different</H2>
      <P>
        Reattend is not a wiki you have to maintain. It is a shared memory that builds itself
        from the work your team already does. When you capture a decision, save meeting notes,
        or log project context, Reattend organizes and connects it automatically. Your knowledge
        base grows as a natural byproduct of your work.
      </P>

      <H3>Built from real work, not documentation effort</H3>
      <P>
        The knowledge in Reattend comes from actual meetings, decisions, and conversations. It
        is not a polished wiki article that someone spent an hour writing. It is the raw, real
        context your team generates every day, organized and searchable.
      </P>

      <H3>AI keeps it organized</H3>
      <P>
        Reattend's AI categorizes memories by type (decisions, meetings, ideas, insights),
        tags entities (people, projects, tools), and links related memories together. You do
        not have to build a folder structure or maintain a table of contents. The organization
        happens automatically.
      </P>

      <H3>Always current because it is always being added to</H3>
      <P>
        Traditional wikis go stale because updating them is a separate task. Reattend stays
        current because your team is constantly adding new memories as part of their normal
        workflow. The latest decision overrides or supplements the old one. The knowledge base
        evolves with your team.
      </P>

      <H3>Semantic search that actually works</H3>
      <P>
        Have you ever searched a wiki for something you know is there but cannot find? Reattend
        uses semantic search that understands what you mean, not just what you type. Search for
        "how we handle authentication" and find the relevant memories even if those exact words
        were never used.
      </P>

      <H2>Reattend vs. traditional knowledge bases</H2>
      <UL>
        <li><Strong>Traditional KB:</Strong> you write documentation, then try to keep it updated. <Strong>Reattend:</Strong> knowledge is captured from real work automatically.</li>
        <li><Strong>Traditional KB:</Strong> someone has to organize pages into folders and categories. <Strong>Reattend:</Strong> AI organizes and links everything for you.</li>
        <li><Strong>Traditional KB:</Strong> search only finds exact keyword matches. <Strong>Reattend:</Strong> semantic search understands meaning and context.</li>
        <li><Strong>Traditional KB:</Strong> goes stale after a few months. <Strong>Reattend:</Strong> stays current because it is built from ongoing work.</li>
        <li><Strong>Traditional KB:</Strong> separate from where work happens. <Strong>Reattend:</Strong> integrated into your workflow through inbox capture and integrations.</li>
      </UL>

      <H2>What this looks like in practice</H2>
      <OL>
        <li><Strong>Your team works normally</Strong>: meetings happen, decisions get made, context gets shared.</li>
        <li><Strong>Along the way</Strong>, key moments are captured in Reattend (takes seconds, not minutes).</li>
        <li><Strong>AI organizes</Strong> everything into a connected, searchable knowledge graph.</li>
        <li><Strong>When anyone needs to know something</Strong>, they search or ask AI and get the answer instantly.</li>
      </OL>

      <H2>Why this approach works</H2>
      <P>
        The best knowledge base is the one your team actually uses. And teams use systems that
        do not create extra work. Reattend asks for minimal effort (just capture moments as they
        happen) and delivers maximum value (a searchable, connected memory of everything your
        team knows). That is why it works when traditional wikis fail.
      </P>
    </>
  ),
}
