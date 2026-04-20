import React from 'react'


/* ------------------------------------------------------------------ */
/*  Shared prose wrapper                                               */
/* ------------------------------------------------------------------ */
function P({ children }: { children: React.ReactNode }) {
 return <p className="text-[15px] leading-relaxed text-gray-600 mb-4">{children}</p>
}
function H2({ children }: { children: React.ReactNode }) {
 return <h2 className="text-[18px] font-semibold text-[#1a1a2e] mt-8 mb-3">{children}</h2>
}
function UL({ children }: { children: React.ReactNode }) {
 return <ul className="list-disc pl-5 space-y-1.5 text-[15px] text-gray-600 mb-4">{children}</ul>
}
function OL({ children }: { children: React.ReactNode }) {
 return <ol className="list-decimal pl-5 space-y-1.5 text-[15px] text-gray-600 mb-4">{children}</ol>
}
function Tip({ children }: { children: React.ReactNode }) {
 return (
   <div className="rounded-xl bg-[#4F46E5]/5 border border-[#4F46E5]/10 px-4 py-3 mb-4">
     <p className="text-[13px] text-[#4F46E5] font-semibold mb-1">Tip</p>
     <p className="text-[14px] text-gray-600 leading-relaxed">{children}</p>
   </div>
 )
}


/* ------------------------------------------------------------------ */
/*  Article content keyed by "category/article"                        */
/* ------------------------------------------------------------------ */
export const HELP_CONTENT: Record<string, React.ReactNode> = {


 /* ================================================================ */
 /*  GETTING STARTED                                                  */
 /* ================================================================ */


 'getting-started/what-is-reattend': (
   <>
     <P>
       Reattend is an AI-powered shared memory platform for teams and individuals. It captures the
       decisions, notes, ideas, and context from your daily work, organizes them with AI, and makes
       everything searchable and connected.
     </P>
     <H2>The problem Reattend solves</H2>
     <P>
       Teams lose context every day. Decisions are made in meetings but never recorded. Notes are
       scattered across apps. When someone asks &quot;why did we decide that?&quot; nobody remembers.
       Reattend fixes this by creating a living, AI-enriched knowledge graph from your everyday work.
     </P>
     <H2>How it works</H2>
     <OL>
       <li><strong>Capture</strong> - Drop raw thoughts, meeting notes, decisions, or snippets into the inbox. Connect Gmail, Slack, or Teams for automatic capture.</li>
       <li><strong>AI Processing</strong> - Reattend&apos;s AI agent classifies each item (Decision, Meeting, Idea, etc.), extracts entities (people, organizations, topics), and enriches it with tags and a confidence score.</li>
       <li><strong>Connect</strong> - The AI automatically finds related memories and links them into a knowledge graph. Over time, patterns emerge.</li>
       <li><strong>Explore</strong> - Search with text or semantic queries, ask questions with Ask AI, or spatially arrange memories on the whiteboard.</li>
     </OL>
     <H2>Key concepts</H2>
     <UL>
       <li><strong>Memory</strong> - A structured unit of knowledge: a decision, a meeting note, an idea, or any captured context.</li>
       <li><strong>Workspace</strong> - A personal or team space where memories live. Each workspace has its own graph.</li>
       <li><strong>Project</strong> - A way to group related memories (e.g. &quot;Q1 Launch&quot; or &quot;Product Strategy&quot;).</li>
       <li><strong>Board</strong> - A visual canvas where you arrange memories spatially, draw connections, and add notes.</li>
       <li><strong>Knowledge Graph</strong> - The web of connections between memories, built automatically by AI and enriched by you.</li>
     </UL>
   </>
 ),


 'getting-started/creating-your-account': (
   <>
     <P>Getting started with Reattend takes less than a minute.</P>
     <H2>Sign up</H2>
     <OL>
       <li>Visit <strong>reattend.com</strong> and click <strong>Get started</strong>.</li>
       <li>Enter your email address.</li>
       <li>Check your inbox for a one-time verification code (OTP) and enter it.</li>
       <li>Set your display name.</li>
     </OL>
     <P>
       That&apos;s it - no password needed. Reattend uses magic-link / OTP authentication to keep your
       account secure without passwords.
     </P>
     <H2>Your personal workspace</H2>
     <P>
       After signing up, a personal workspace is automatically created for you. This is your private
       space - only you can see its memories. You can create additional team workspaces later.
     </P>
     <H2>Setting up your profile</H2>
     <P>
       Head to <strong>Settings → Profile</strong> to update your display name and avatar. Your email
       is fixed to the one you signed up with.
     </P>
   </>
 ),


 'getting-started/navigating-the-dashboard': (
   <>
     <P>The dashboard is your home base. Here&apos;s what you&apos;ll see:</P>
     <H2>Topbar</H2>
     <UL>
       <li><strong>Workspace switcher</strong> - Toggle between personal and team workspaces. Shows your role (Owner, Admin, Member) for teams.</li>
       <li><strong>Notifications bell</strong> - See todos, pending decisions, and suggestions.</li>
       <li><strong>Search</strong> - Quick access to global search.</li>
       <li><strong>Board</strong> - Jump to the whiteboard.</li>
       <li><strong>Inbox</strong> - Open the inbox.</li>
       <li><strong>Ask AI</strong> - Open the AI chat panel.</li>
     </UL>
     <H2>Sidebar</H2>
     <UL>
       <li><strong>Home</strong> - The dashboard with stats and recent activity.</li>
       <li><strong>Memories</strong> - Browse all memories.</li>
       <li><strong>Projects</strong> - Your organized memory groups.</li>
       <li><strong>Integrations</strong> - Connect external tools.</li>
       <li><strong>Settings</strong> - Profile, workspace, members, and advanced settings.</li>
     </UL>
     <H2>Dashboard stats</H2>
     <P>
       The dashboard shows at-a-glance metrics: total memories, projects, entities, connections, and
       inbox items. Below are memory type breakdowns, a 7-day activity chart, and your most recent
       memories.
     </P>
   </>
 ),


 'getting-started/quick-start-guide': (
   <>
     <P>Get up and running in five minutes. Follow these steps:</P>
     <H2>Step 1: Create a project</H2>
     <P>
       Go to <strong>Projects</strong> in the sidebar and click <strong>New Project</strong>. Give it a
       name (e.g. &quot;Product Ideas&quot;), pick a color, and save. Projects help you organize
       memories into meaningful groups.
     </P>
     <H2>Step 2: Capture your first memory</H2>
     <P>
       Go to the <strong>Inbox</strong> and type a raw thought - a decision, a meeting note, or an
       idea. Click <strong>Capture</strong>. The AI will automatically classify and enrich it.
     </P>
     <H2>Step 3: Explore the board</H2>
     <P>
       Open the <strong>Board</strong> from the topbar. Your memories appear as nodes. Try adding
       sticky notes, drawing connections, and rearranging the canvas.
     </P>
     <H2>Step 4: Try Ask AI</H2>
     <P>
       Click <strong>Ask AI</strong> in the topbar and ask a question like &quot;What decisions have I
       made recently?&quot; The AI searches your memories and gives a conversational answer.
     </P>
     <H2>Step 5: Invite your team (optional)</H2>
     <P>
       Click the workspace switcher and select <strong>Create Team</strong>. Name your team workspace,
       then invite members by email from <strong>Settings → Members</strong>.
     </P>
     <Tip>Complete the onboarding checklist on the dashboard for guided step-by-step progress.</Tip>
   </>
 ),


 /* ================================================================ */
 /*  INBOX & CAPTURE                                                  */
 /* ================================================================ */


 'inbox/capturing-raw-items': (
   <>
     <P>
       The inbox is where everything starts. Think of it as a drop zone for raw thoughts - you don&apos;t
       need to organize anything upfront.
     </P>
     <H2>What you can capture</H2>
     <UL>
       <li>Meeting notes and action items</li>
       <li>Decisions and their rationale</li>
       <li>Ideas and brainstorms</li>
       <li>Snippets from conversations</li>
       <li>Links, references, and context</li>
     </UL>
     <H2>How it works</H2>
     <OL>
       <li>Open the <strong>Inbox</strong> from the sidebar or topbar.</li>
       <li>Type your raw content in the capture field.</li>
       <li>Click <strong>Capture</strong> (or press Enter).</li>
       <li>The item appears in your inbox with a &quot;New&quot; status.</li>
       <li>AI automatically processes it - classifying, enriching, and creating a memory.</li>
     </OL>
     <P>
       Once processed, the item status changes to &quot;Triaged&quot; and a new memory is created in
       your workspace with extracted entities, tags, and a confidence score.
     </P>
   </>
 ),


 'inbox/manual-capture': (
   <>
     <P>
       For more control over what you capture, use manual capture to add metadata upfront.
     </P>
     <H2>Adding metadata</H2>
     <P>When creating an inbox item manually, you can specify:</P>
     <UL>
       <li><strong>Source</strong> - Where the information came from (e.g. Gmail, Slack, a meeting).</li>
       <li><strong>Date/time</strong> - When the event or decision happened (defaults to now).</li>
       <li><strong>Project</strong> - Assign it to a project immediately.</li>
     </UL>
     <H2>When to use manual capture</H2>
     <P>
       Manual capture is useful when you want to backfill important context from the past, or when
       you know exactly which project something belongs to. For quick thoughts, regular capture is
       faster.
     </P>
   </>
 ),


 'inbox/ai-triage': (
   <>
     <P>
       When you capture a raw item, Reattend&apos;s AI triage agent processes it automatically. Here&apos;s
       what happens behind the scenes:
     </P>
     <H2>The triage pipeline</H2>
     <OL>
       <li><strong>Classification</strong> - The AI reads your raw text and determines the memory type: Decision, Meeting, Idea, Insight, Context, Task, or Note.</li>
       <li><strong>Enrichment</strong> - A structured title and summary are generated. The AI also assigns a confidence score (how certain it is about the classification).</li>
       <li><strong>Entity extraction</strong> - People, organizations, and topics mentioned in the text are identified and linked.</li>
       <li><strong>Tagging</strong> - Relevant tags are auto-generated based on the content.</li>
       <li><strong>Embedding</strong> - A semantic embedding is generated so the memory can be found via semantic search.</li>
       <li><strong>Linking</strong> - The AI finds related memories in your workspace and creates connections.</li>
     </OL>
     <Tip>If the AI classifies something incorrectly, you can always edit the memory type, tags, and other fields manually.</Tip>
     <H2>Viewing triage logs</H2>
     <P>
       Go to <strong>Settings → Agent Logs</strong> to see the status of each triage job - pending,
       running, completed, or failed. You can also manually re-trigger triage from the Advanced tab.
     </P>
   </>
 ),


 'inbox/source-filtering': (
   <>
     <P>
       If you have integrations connected, your inbox will fill up with items from multiple sources.
       Use source filtering to focus on what matters.
     </P>
     <H2>Available source filters</H2>
     <UL>
       <li><strong>All Sources</strong> - Show everything.</li>
       <li><strong>Gmail</strong> - Only items captured from email.</li>
       <li><strong>Slack</strong> - Only items from Slack messages and threads.</li>
       <li><strong>Teams</strong> - Only items from Microsoft Teams.</li>
     </UL>
     <H2>Status filters</H2>
     <P>
       You can also filter by status: <strong>New</strong> (not yet processed), <strong>Triaged</strong>
       (processed into memories), or <strong>Ignored</strong> (dismissed items). Use the toggle to
       show or hide ignored items.
     </P>
   </>
 ),


 /* ================================================================ */
 /*  MEMORIES                                                         */
 /* ================================================================ */


 'memories/understanding-memories': (
   <>
     <P>
       Memories are the core building blocks of Reattend. Each memory is a structured, AI-enriched
       unit of knowledge that lives in your workspace.
     </P>
     <H2>Memory vs. raw item</H2>
     <P>
       A <strong>raw item</strong> is the unprocessed text you drop into the inbox. A <strong>memory</strong>
       is what the AI creates from it - enriched with a type, title, summary, entities, tags, and a
       confidence score.
     </P>
     <H2>What makes up a memory</H2>
     <UL>
       <li><strong>Title</strong> - AI-generated (editable) short headline.</li>
       <li><strong>Summary</strong> - A concise description of the captured context.</li>
       <li><strong>Type</strong> - One of seven categories (Decision, Meeting, Idea, etc.).</li>
       <li><strong>Confidence</strong> - How certain the AI is about its classification (0–100%).</li>
       <li><strong>Entities</strong> - Extracted people, organizations, and topics.</li>
       <li><strong>Tags</strong> - Auto-generated and user-added labels.</li>
       <li><strong>Connections</strong> - Links to related memories in the knowledge graph.</li>
       <li><strong>Project</strong> - The project this memory belongs to (optional).</li>
     </UL>
   </>
 ),


 'memories/memory-types': (
   <>
     <P>Every memory in Reattend is classified into one of seven types:</P>
     <H2>The seven types</H2>
     <UL>
       <li><strong>Decision</strong> - A choice that was made, with its rationale and implications.</li>
       <li><strong>Meeting</strong> - Notes, outcomes, or action items from a meeting.</li>
       <li><strong>Idea</strong> - A concept, brainstorm, or creative thought worth remembering.</li>
       <li><strong>Insight</strong> - A realization or observation drawn from data or experience.</li>
       <li><strong>Context</strong> - Background information that helps others understand a situation.</li>
       <li><strong>Task</strong> - An action item or to-do that needs to be tracked.</li>
       <li><strong>Note</strong> - General notes that don&apos;t fit neatly into other categories.</li>
     </UL>
     <H2>Why types matter</H2>
     <P>
       Types help you filter and find memories quickly. They also help the AI make better connections -
       for example, linking a Decision to the Meeting where it was discussed, or connecting an Idea to
       the Insight that inspired it.
     </P>
     <P>
       Each type has a distinct color in the UI, making it easy to spot at a glance on the dashboard,
       board, and memory list.
     </P>
   </>
 ),


 'memories/creating-memories': (
   <>
     <P>
       While most memories are created automatically through inbox triage, you can also create them
       directly.
     </P>
     <H2>Creating from the memories page</H2>
     <OL>
       <li>Go to <strong>Memories</strong> in the sidebar.</li>
       <li>Click <strong>New Memory</strong>.</li>
       <li>Enter the content - plain text or a file upload.</li>
       <li>The AI will process it in the background, adding type, entities, and tags.</li>
     </OL>
     <H2>Creating from the inbox</H2>
     <P>
       Capture a raw item in the inbox and let AI triage handle the rest. This is the recommended
       workflow for most users.
     </P>
     <H2>File uploads</H2>
     <P>
       You can upload files when creating a memory. The AI will read the file content and enrich the
       memory accordingly.
     </P>
   </>
 ),


 'memories/editing-and-managing': (
   <>
     <P>Every memory is fully editable after creation.</P>
     <H2>Editing a memory</H2>
     <P>
       Click on any memory to open its detail view. From there you can edit the title, summary, type,
       tags, and project assignment. Changes are saved automatically.
     </P>
     <H2>Locking memories</H2>
     <P>
       Lock a memory to prevent accidental edits. Locked memories display a lock icon and require
       unlocking before changes can be made. This is useful for important decisions or finalized
       meeting notes.
     </P>
     <H2>Deleting memories</H2>
     <P>
       Delete a memory from its detail view. You&apos;ll be asked to confirm before deletion. Deleting a
       memory also removes its connections and entities.
     </P>
     <Tip>Think twice before deleting - memories contribute to your knowledge graph. Consider locking instead of deleting.</Tip>
   </>
 ),


 'memories/entities-and-tags': (
   <>
     <P>
       The AI automatically extracts structured information from your memories.
     </P>
     <H2>Entities</H2>
     <P>Reattend extracts three types of entities:</P>
     <UL>
       <li><strong>People</strong> - Names of individuals mentioned in the text.</li>
       <li><strong>Organizations</strong> - Companies, teams, or groups referenced.</li>
       <li><strong>Topics</strong> - Key subjects or themes discussed.</li>
     </UL>
     <P>
       Entities are shared across memories - if &quot;Sarah&quot; is mentioned in multiple memories,
       they&apos;re all linked to the same entity. This makes it easy to find everything related to a person,
       company, or topic.
     </P>
     <H2>Tags</H2>
     <P>
       Tags are lightweight labels. The AI generates tags automatically, and you can add or remove
       your own. Tags are searchable and visible on memory cards throughout the app.
     </P>
   </>
 ),


 'memories/file-attachments': (
   <>
     <P>
       Attach files to memories for additional context.
     </P>
     <H2>Supported files</H2>
     <P>
       You can attach documents, images, and other files when creating or editing a memory. Files are
       stored securely and associated with the memory.
     </P>
     <H2>When to use attachments</H2>
     <UL>
       <li>Meeting slides or recordings</li>
       <li>Design mockups or screenshots</li>
       <li>Reference documents or reports</li>
       <li>Any file that adds context to the memory</li>
     </UL>
   </>
 ),


 /* ================================================================ */
 /*  PROJECTS                                                         */
 /* ================================================================ */


 'projects/creating-projects': (
   <>
     <P>
       Projects are the primary way to group related memories.
     </P>
     <H2>Creating a project</H2>
     <OL>
       <li>Go to <strong>Projects</strong> in the sidebar.</li>
       <li>Click <strong>New Project</strong>.</li>
       <li>Enter a name (e.g. &quot;Q1 Product Launch&quot;).</li>
       <li>Add an optional description.</li>
       <li>Pick a color from 10 presets.</li>
       <li>Click <strong>Create</strong>.</li>
     </OL>
     <H2>Managing projects</H2>
     <P>
       Click on any project card to view its details. From there you can edit the name, description,
       and color. You can also delete projects - but this won&apos;t delete the memories inside them, just
       the grouping.
     </P>
     <H2>Default project</H2>
     <P>
       Each workspace has a default project that catches memories not assigned elsewhere. You can&apos;t
       delete the default project, but you can rename it.
     </P>
   </>
 ),


 'projects/organizing-memories': (
   <>
     <P>Once you have projects, assigning memories to them is straightforward.</P>
     <H2>Assigning memories</H2>
     <UL>
       <li><strong>From memory detail</strong> - Open any memory and use the project dropdown to assign it.</li>
       <li><strong>During capture</strong> - Assign a project when manually capturing inbox items.</li>
       <li><strong>During triage</strong> - The AI may suggest a project during automatic processing.</li>
     </UL>
     <H2>Moving between projects</H2>
     <P>
       Change a memory&apos;s project at any time from its detail view. Select a different project from the
       dropdown and it moves instantly.
     </P>
   </>
 ),


 'projects/ai-project-suggestions': (
   <>
     <P>
       Reattend&apos;s AI can analyze your unorganized memories and suggest project groupings.
     </P>
     <H2>How it works</H2>
     <P>
       The AI looks at the content, entities, and tags across your memories to identify natural
       clusters. It then suggests project names and which memories belong to each.
     </P>
     <H2>Accepting suggestions</H2>
     <P>
       When suggestions are available, you&apos;ll see them in the project detail view. You can accept a
       suggestion (which creates the project and assigns the memories), modify it, or dismiss it entirely.
     </P>
     <H2>Rebuilding suggestions</H2>
     <P>
       Go to <strong>Settings → Advanced</strong> and click <strong>Rebuild Project Suggestions</strong>
       to have the AI re-analyze your workspace.
     </P>
   </>
 ),


 /* ================================================================ */
 /*  BOARD & WHITEBOARD                                               */
 /* ================================================================ */


 'board/board-overview': (
   <>
     <P>
       The board is a visual, Miro-like canvas where you can spatially arrange your memories, draw
       connections, and add notes. It&apos;s powered by React Flow and provides an infinite canvas.
     </P>
     <H2>Opening the board</H2>
     <P>
       Click the <strong>Board</strong> icon in the topbar, or navigate via the sidebar. The board
       shows your workspace&apos;s memories as interactive nodes on a canvas.
     </P>
     <H2>What you can do</H2>
     <UL>
       <li>Drag and rearrange memory nodes</li>
       <li>Add sticky notes, shapes, and text</li>
       <li>Draw connections between nodes with typed edges</li>
       <li>Use the pen tool to sketch</li>
       <li>Add comments to nodes</li>
       <li>Filter by memory type or tag</li>
       <li>Zoom, pan, and use the minimap</li>
       <li>Download or share your board</li>
     </UL>
     <Tip>The board auto-saves. Your layout persists between sessions.</Tip>
   </>
 ),


 'board/node-types': (
   <>
     <P>The board supports several types of nodes:</P>
     <H2>Memory nodes</H2>
     <P>
       Your memories appear as cards colored by type (e.g. blue for Decision, green for Idea). Each
       shows the title and an emoji indicator. Click to expand details.
     </P>
     <H2>Sticky notes</H2>
     <P>
       Add quick notes to the canvas. Choose from 6 colors: yellow, pink, blue, green, purple, and
       orange. Great for brainstorming or adding context around memories.
     </P>
     <H2>Shape nodes</H2>
     <UL>
       <li><strong>Rectangle</strong> - For process steps or grouping.</li>
       <li><strong>Diamond</strong> - For decisions or branch points.</li>
       <li><strong>Circle</strong> - For states or highlights.</li>
     </UL>
     <H2>Text nodes</H2>
     <P>Add plain text labels anywhere on the canvas.</P>
     <H2>Embed nodes</H2>
     <P>Embed images, videos, or links directly on the board for reference.</P>
   </>
 ),


 'board/drawing-connections': (
   <>
     <P>
       Connections (edges) show relationships between nodes. They&apos;re a key part of building your
       visual knowledge graph.
     </P>
     <H2>Creating connections</H2>
     <P>
       Hover over a node to see connection handles. Click and drag from one handle to another node to
       create an edge. You&apos;ll be prompted to choose a relationship type.
     </P>
     <H2>Edge types</H2>
     <UL>
       <li><strong>Related to</strong> (purple) - General association.</li>
       <li><strong>Depends on</strong> (blue) - One item depends on another.</li>
       <li><strong>Leads to</strong> (green) - Causal or sequential relationship.</li>
       <li><strong>Contradicts</strong> (red) - Conflicting information.</li>
       <li><strong>Supports</strong> (orange) - Evidence or reinforcement.</li>
       <li><strong>Part of</strong> (pink) - Hierarchical containment.</li>
       <li><strong>Blocks</strong> (gray) - Something preventing progress.</li>
     </UL>
     <P>
       You can also set custom edge colors for additional visual distinction.
     </P>
   </>
 ),


 'board/canvas-tools': (
   <>
     <P>The board toolbar gives you four primary modes:</P>
     <H2>Select mode</H2>
     <P>
       The default mode. Click to select nodes, drag to move them, or multi-select with a box
       selection. Selected nodes show visual feedback and can be deleted.
     </P>
     <H2>Pan mode</H2>
     <P>
       Click and drag the canvas to pan around. Use the scroll wheel to zoom. The minimap in the
       corner shows your current viewport.
     </P>
     <H2>Draw mode</H2>
     <P>
       Use the pen tool to freehand sketch on the canvas. Choose from 6 pen colors. Great for quick
       annotations or circling important areas.
     </P>
     <H2>Comment mode</H2>
     <P>
       Click on any node to add a comment. Comments are visible in the node&apos;s detail view and help
       add context without modifying the memory itself.
     </P>
     <H2>Additional controls</H2>
     <UL>
       <li><strong>Undo/Redo</strong> - Step back or forward through changes.</li>
       <li><strong>Reset board</strong> - Clear the canvas layout (memories are preserved).</li>
       <li><strong>Download</strong> - Export the board as an image.</li>
       <li><strong>Full-screen</strong> - Expand the board to fill your screen.</li>
     </UL>
   </>
 ),


 /* ================================================================ */
 /*  SEARCH                                                           */
 /* ================================================================ */


 'search/search-overview': (
   <>
     <P>
       Reattend offers hybrid search that combines traditional keyword matching with AI-powered
       semantic understanding.
     </P>
     <H2>How it works</H2>
     <P>
       When you search, Reattend runs two searches in parallel:
     </P>
     <OL>
       <li><strong>Text search</strong> - Matches exact words and phrases in memory titles, summaries, and content.</li>
       <li><strong>Semantic search</strong> - Converts your query into an embedding and finds memories with similar meaning, even if they use different words.</li>
     </OL>
     <P>
       Results are merged and ranked by relevance. Each result shows a similarity score and whether it
       was found via text, semantic, or both.
     </P>
     <H2>What gets searched</H2>
     <UL>
       <li>Memory titles and summaries</li>
       <li>Projects</li>
       <li>Entities (people, organizations, topics)</li>
       <li>Tags</li>
     </UL>
   </>
 ),


 'search/search-modes': (
   <>
     <P>You can switch between three search modes depending on what you need:</P>
     <H2>Hybrid mode (default)</H2>
     <P>
       Combines text and semantic search for the best of both worlds. Start here - it works well for
       most queries.
     </P>
     <H2>Text-only mode</H2>
     <P>
       Traditional keyword search. Use this when you know the exact words or phrases you&apos;re looking
       for. Faster for precise lookups like names or specific terms.
     </P>
     <H2>Semantic-only mode</H2>
     <P>
       Uses AI embeddings to find conceptually similar memories. Great for vague queries like
       &quot;that thing about our pricing change&quot; - even if the exact words don&apos;t match.
     </P>
   </>
 ),


 'search/search-tips': (
   <>
     <P>Get better search results with these tips:</P>
     <H2>Be specific</H2>
     <P>
       Instead of &quot;meeting&quot;, try &quot;product roadmap meeting with Sarah&quot;. More
       context helps both text and semantic search.
     </P>
     <H2>Use natural language for semantic search</H2>
     <P>
       Semantic search understands meaning. Ask questions like &quot;why did we change the pricing
       model?&quot; and it will find relevant memories even if they don&apos;t contain those exact words.
     </P>
     <H2>Switch modes when needed</H2>
     <P>
       If hybrid gives too many results, switch to text-only for precision. If you can&apos;t find what
       you need with keywords, try semantic-only.
     </P>
     <Tip>Search results show colored badges for memory types - use these to quickly scan for the right kind of memory.</Tip>
   </>
 ),


 /* ================================================================ */
 /*  ASK AI                                                           */
 /* ================================================================ */


 'ask-ai/asking-questions': (
   <>
     <P>
       Ask AI is a conversational interface that lets you query your entire memory graph using natural
       language.
     </P>
     <H2>Opening Ask AI</H2>
     <P>
       Click the <strong>Ask AI</strong> button in the topbar. A side panel opens with a chat
       interface.
     </P>
     <H2>What you can ask</H2>
     <UL>
       <li>&quot;What decisions have we made about pricing?&quot;</li>
       <li>&quot;Summarize last week&apos;s meetings.&quot;</li>
       <li>&quot;What do we know about competitor X?&quot;</li>
       <li>&quot;When did we decide to change the API structure?&quot;</li>
       <li>&quot;What are the open action items from the Q1 review?&quot;</li>
     </UL>
     <H2>How it works</H2>
     <P>
       Ask AI searches your memories using semantic similarity, retrieves the most relevant ones, and
       uses an LLM to compose a conversational answer grounded in your actual data. It supports
       multi-turn conversations - ask follow-up questions to dig deeper.
     </P>
   </>
 ),


 'ask-ai/conversation-tips': (
   <>
     <P>Get the most out of Ask AI with these tips:</P>
     <H2>Be specific about what you want</H2>
     <P>
       Instead of &quot;tell me about the project&quot;, try &quot;what are the key decisions we made
       for the Q1 launch project?&quot;
     </P>
     <H2>Ask follow-up questions</H2>
     <P>
       Ask AI remembers the conversation context. After getting an answer, ask follow-ups like
       &quot;Can you elaborate on the second point?&quot; or &quot;When exactly was that decided?&quot;
     </P>
     <H2>Ask about people or topics</H2>
     <P>
       &quot;What has Sarah worked on this month?&quot; or &quot;What do we know about machine
       learning?&quot; - the AI uses entities to find relevant memories.
     </P>
     <H2>Limitations</H2>
     <P>
       Ask AI can only answer based on memories in your current workspace. If you switch workspaces,
       the AI searches a different set of memories.
     </P>
   </>
 ),


 /* ================================================================ */
 /*  TEAMS & COLLABORATION                                            */
 /* ================================================================ */


 'teams/creating-a-team': (
   <>
     <P>
       Team workspaces let multiple people contribute to and benefit from a shared memory graph.
     </P>
     <H2>Creating a team</H2>
     <OL>
       <li>Click the workspace switcher in the topbar.</li>
       <li>Select <strong>Create Team</strong>.</li>
       <li>Enter a team name.</li>
       <li>Click <strong>Create</strong>.</li>
     </OL>
     <P>
       You&apos;ll be the owner of the new team workspace. Next, invite members and start capturing
       shared memories.
     </P>
     <H2>Teams</H2>
     <P>
       Team workspaces are included in the Pro plan ($20/month per user). See <strong>Billing</strong> for details.
     </P>
   </>
 ),


 'teams/inviting-members': (
   <>
     <P>Only workspace owners and admins can invite new members.</P>
     <H2>Sending invites</H2>
     <OL>
       <li>Go to <strong>Settings → Members</strong>.</li>
       <li>Enter the email address of the person you want to invite.</li>
       <li>Choose a role: <strong>Member</strong> or <strong>Admin</strong>.</li>
       <li>Click <strong>Invite</strong>.</li>
     </OL>
     <P>
       The invitee will receive an email with an invite link. They can accept it by clicking the link,
       signing in (or creating an account), and joining the workspace.
     </P>
     <H2>Managing invites</H2>
     <P>
       View pending invites in <strong>Settings → Invites</strong>. You can resend an invite or
       revoke it. Invites expire after a set period.
     </P>
   </>
 ),


 'teams/roles-and-permissions': (
   <>
     <P>Team workspaces have three roles:</P>
     <H2>Owner</H2>
     <UL>
       <li>Full control over the workspace</li>
       <li>Can invite and remove members</li>
       <li>Can change member roles</li>
       <li>Can delete the workspace</li>
       <li>Can manage billing and settings</li>
     </UL>
     <H2>Admin</H2>
     <UL>
       <li>Can invite and remove members</li>
       <li>Can manage workspace settings</li>
       <li>Can create projects and memories</li>
       <li>Cannot delete the workspace</li>
       <li>Cannot change the owner</li>
     </UL>
     <H2>Member</H2>
     <UL>
       <li>Can create and edit memories</li>
       <li>Can create and manage projects</li>
       <li>Can use the board, search, and Ask AI</li>
       <li>Cannot invite or remove members</li>
       <li>Cannot change workspace settings</li>
     </UL>
     <P>
       Your role is shown as a colored pill in the workspace switcher dropdown - amber for Owner,
       indigo for Admin, and gray for Member.
     </P>
   </>
 ),


 'teams/switching-workspaces': (
   <>
     <P>
       You can belong to multiple workspaces - your personal workspace plus any team workspaces
       you&apos;ve created or joined.
     </P>
     <H2>Switching</H2>
     <P>
       Click the workspace name in the center of the topbar. A dropdown shows all your workspaces with
       their type (Personal or Team) and your role. Click on any workspace to switch to it.
     </P>
     <H2>What changes when you switch</H2>
     <P>
       Everything in the app is scoped to the current workspace. Memories, projects, boards, search
       results, and Ask AI all reflect the selected workspace. Your personal workspace is completely
       separate from your team workspaces.
     </P>
   </>
 ),


 'teams/shared-knowledge-graph': (
   <>
     <P>
       When team members capture and organize memories in a shared workspace, they all contribute to a
       single knowledge graph.
     </P>
     <H2>How it works</H2>
     <P>
       Every memory, entity, and connection in a team workspace is visible to all members. The AI
       links memories from different contributors, creating a rich web of organizational knowledge.
     </P>
     <H2>Benefits</H2>
     <UL>
       <li>No knowledge silos - everyone&apos;s context is connected.</li>
       <li>Ask AI can answer questions using the entire team&apos;s memory.</li>
       <li>New team members can quickly catch up by exploring the graph.</li>
       <li>Decisions and their rationale are preserved for future reference.</li>
     </UL>
   </>
 ),


 /* ================================================================ */
 /*  INTEGRATIONS                                                     */
 /* ================================================================ */


 'integrations/available-integrations': (
   <>
     <P>
       Reattend connects to your existing tools to automatically capture context. Browse available
       integrations at <strong>Integrations</strong> in the sidebar.
     </P>
     <H2>Connected integrations</H2>
     <UL>
       <li><strong>Gmail</strong> - Capture emails and threads as inbox items.</li>
       <li><strong>Slack</strong> - Capture messages, threads, and channel updates.</li>
       <li><strong>Microsoft Teams</strong> - Capture team conversations and meeting notes.</li>
       <li><strong>Google Calendar</strong> - Import calendar events for context.</li>
       <li><strong>Webhooks</strong> - Send data from any tool via HTTP.</li>
     </UL>
     <H2>Coming soon</H2>
     <P>
       We&apos;re building integrations with 100+ tools including Notion, Jira, GitHub, Zoom, Confluence,
       Linear, Figma, and more. All integrations will be included in every plan at no extra cost.
     </P>
   </>
 ),


 'integrations/connecting-gmail': (
   <>
     <P>Connect Gmail to automatically capture important emails as inbox items.</P>
     <H2>Setup</H2>
     <OL>
       <li>Go to <strong>Integrations</strong> in the sidebar.</li>
       <li>Find <strong>Gmail</strong> and click <strong>Connect</strong>.</li>
       <li>Sign in with your Google account and grant permissions.</li>
       <li>Choose which labels or filters to sync (optional).</li>
     </OL>
     <H2>What gets captured</H2>
     <P>
       Emails matching your sync criteria appear in the inbox with a Gmail source badge. The AI
       processes them like any other inbox item - classifying, enriching, and creating memories.
     </P>
     <H2>Managing the connection</H2>
     <P>
       Go to <strong>Integrations</strong> to refresh the sync, change settings, or disconnect Gmail
       entirely. Disconnecting does not delete previously captured memories.
     </P>
   </>
 ),


 'integrations/connecting-slack': (
   <>
     <P>Connect Slack to capture messages and threads as inbox items.</P>
     <H2>Setup</H2>
     <OL>
       <li>Go to <strong>Integrations</strong> in the sidebar.</li>
       <li>Find <strong>Slack</strong> and click <strong>Connect</strong>.</li>
       <li>Authorize Reattend in your Slack workspace.</li>
       <li>Choose which channels to monitor (optional).</li>
     </OL>
     <H2>What gets captured</H2>
     <P>
       Messages from monitored channels appear in the inbox with a Slack source badge. Thread replies
       are grouped together. The AI processes them into structured memories.
     </P>
   </>
 ),


 'integrations/webhooks': (
   <>
     <P>
       Use webhooks to send data to Reattend from any tool or custom workflow.
     </P>
     <H2>How it works</H2>
     <P>
       Reattend provides a webhook endpoint for your workspace. Send a POST request with your data,
       and it appears as an inbox item for AI processing.
     </P>
     <H2>Use cases</H2>
     <UL>
       <li>CI/CD pipeline notifications</li>
       <li>Custom monitoring alerts</li>
       <li>Data from tools without native integrations</li>
       <li>Automated capture from scripts or bots</li>
     </UL>
   </>
 ),


 /* ================================================================ */
 /*  ACCOUNT & BILLING                                                */
 /* ================================================================ */


 'account/profile-settings': (
   <>
     <P>Manage your personal account settings from the Settings page.</P>
     <H2>Updating your profile</H2>
     <P>
       Go to <strong>Settings → Profile</strong> to update your display name and avatar URL. Your
       email address is fixed to the one you used to sign up and cannot be changed.
     </P>
     <H2>Account details</H2>
     <P>
       The profile tab also shows your account creation date and the current workspace you&apos;re in.
     </P>
   </>
 ),


 'account/workspace-settings': (
   <>
     <P>Each workspace has its own settings.</P>
     <H2>Workspace name</H2>
     <P>
       Go to <strong>Settings → Workspace</strong> to rename your workspace. This name is shown in
       the workspace switcher and visible to all members (for team workspaces).
     </P>
     <H2>Deleting a workspace</H2>
     <P>
       Owners can delete a workspace from the workspace settings tab. This permanently removes all
       memories, projects, boards, and data in the workspace. This action cannot be undone.
     </P>
     <Tip>You cannot delete your personal workspace. Only team workspaces can be deleted.</Tip>
   </>
 ),


 'account/billing-and-plans': (
   <>
     <P>Reattend is a desktop app with a simple pricing model.</P>
     <H2>Free Trial (60 days)</H2>
     <P>All features unlocked for 60 days. No credit card required.</P>
     <UL>
       <li>Ambient screen capture &amp; OCR</li>
       <li>AI triage &amp; auto-classification</li>
       <li>Meeting recording &amp; transcription</li>
       <li>Semantic search &amp; Ask AI</li>
       <li>Knowledge graph &amp; entity extraction</li>
       <li>Writing assist</li>
     </UL>
     <H2>Pro ($20/month per user)</H2>
     <P>Unlimited AI processing forever. Everything in the trial, plus:</P>
     <UL>
       <li>Unlimited memories &amp; captures</li>
       <li>Priority support</li>
       <li>Early access to new features</li>
       <li>Team workspaces</li>
     </UL>
     <H2>Free Forever</H2>
     <P>After the trial, keep using Reattend as a notetaker:</P>
     <UL>
       <li>Browse &amp; export all memories</li>
       <li>Manual note-taking</li>
       <li>Local storage (your data is yours)</li>
       <li>No AI features</li>
     </UL>
     <H2>Enterprise</H2>
     <P>
       Custom pricing for large organizations. Includes SSO/SAML, custom data retention, dedicated
       support, SLAs, and on-premise deployment options. Contact <strong>pb@reattend.ai</strong>.
     </P>
     <H2>Managing billing</H2>
     <P>
       Go to <strong>Billing</strong> in the sidebar to view your current plan, upgrade, or manage
       your subscription. Payments are handled securely via Paddle.
     </P>
   </>
 ),


 'account/data-and-security': (
   <>
     <P>Reattend takes data security seriously.</P>
     <H2>Encryption</H2>
     <UL>
       <li><strong>In transit</strong> - All data is encrypted with TLS 1.3.</li>
       <li><strong>At rest</strong> - Data is encrypted with AES-256 encryption.</li>
     </UL>
     <H2>Data isolation</H2>
     <P>
       Each workspace is completely isolated. Data from one workspace is never accessible from
       another. Team members can only see memories in workspaces they belong to.
     </P>
     <H2>Authentication</H2>
     <P>
       Reattend uses passwordless authentication via one-time passcodes (OTP) sent to your email. No
       passwords to remember, no passwords to leak.
     </P>
     <H2>Data ownership</H2>
     <P>
       Your data belongs to you. We never sell or share your data with third parties. You can delete
       your workspace and all its data at any time.
     </P>
     <Tip>For enterprise security requirements including SSO, custom data retention, and compliance certifications, contact pb@reattend.ai.</Tip>
   </>
 ),
}



