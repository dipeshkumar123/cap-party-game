# CAP - Product Requirements Document

**Version:** 1.0  
**Date:** October 28, 2026  
**Status:** Approved for v1 build  
**Product:** CAP - a real-time bluffing-trivia party game for 2-8 players  
**One-liner:** Everyone gets the same bizarre true fact. Everyone writes a lie. Then the room votes for the truth.

---

## 1. Executive summary

CAP is a browser-based party game for 2-8 players who are on different devices, in different places, with no app install and no host screen. A room code is the only thing players need. Each round presents a real but strange fact with one detail missing. Every player writes a convincing fake answer, then everyone votes for the answer they believe is real. Players score for finding the truth and for fooling others with their lie. Five fast rounds, a dramatic reveal, a shareable result card, and a one-tap rematch.

The product is designed around the proven social loop of Fibbage-style bluffing games, but packaged as a modern, mobile-first, standalone experience rather than a TV-plus-phone companion. It uses an acid-editorial visual language, punchy motion, synthesized sound, and low-friction sharing to feel native to 2026 group chats instead of like a web form with a game attached.

**Why this can win attention**
- Zero-friction entry: link or 5-character code, no account, no download, no TV.
- Built-in social tension: creativity, deception, and the small humiliation of being fooled.
- Fast sessions: roughly 7 minutes for 5 rounds, with a rematch loop.
- Shareable outcome: a spoiler-free result card that gives the group a reason to post and pull in another player.
- Content-led replayability: each match samples a larger curated prompt library.

**v1 success statement**
A group of 2-8 people can open a public URL on separate devices, create or join a room, finish a full 5-round match with accurate scores and a winner, and immediately rematch or share the result, without anyone explaining the rules.

---

## 2. Research foundation

### 2.1 Market signals

- Phone-as-controller party games are still the dominant social format. Jackbox remains the reference point because players join in a browser and use their own phones; the friction is owning the pack and having a shared screen. See [Jackbox's Fibbage help](https://games-netflix.helpshift.com/hc/en/57-the-jackbox-party-essentials/faq/1870-what-is-fibbage-4/) and [Wirecutter's party game picks](https://www.nytimes.com/wirecutter/reviews/best-party-games/).
- The bluffing-trivia loop is proven and works with as few as 2 players and as many as 8. Fibbage itself supports 2-8, uses 7-question sessions, and rewards both truth-finding and successful deception. Source: [Fibbage game manual](https://dlassets-ssl.xboxlive.com/public/content/a6e22d34-3ccc-4356-9e47-34fa1f074545/GameManual/473295d9-ff38-49ea-bd24-8406953bd760/en-CA/index.html).
- Browser party-game competitors are consolidating around no-account rooms, a four-to-five-character code, and multiple games in one place. GameBuddies already offers a Fibbage-style game, Bluffalo. This validates demand but leaves room for a sharper, single-purpose brand with better mobile craft. Source: [GameBuddies](https://gamebuddies.io/).
- Group play is increasingly remote and asynchronous around a call. A game that needs no shared screen is more resilient than the TV-first model: every player's phone can show the same prompt, their own secret input, and the reveal.
- Short, repeatable formats with a shareable artifact outperform endless sessions for organic growth. Wordle's share card is a well-documented driver of its social spread, and research on goal gradients and near-misses explains why rapid, close outcomes feel motivating. Sources: [Northeastern on Wordle](https://news.northeastern.edu/2022/01/21/what-makes-wordle-so-g-r-e-a-t/), [Wordle goal-gradient study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11487082/).
- Streaks and variable rewards can support healthy habit formation but become harmful when they rely on shame, loss aversion, or infinite grinds. CAP uses streaks as cosmetic feedback and gives every session a clean ending. Source: [UX Magazine on ethical streak design](https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame).

### 2.2 Design signals

- 2026 web design is moving away from generic, AI-polished gradients toward raw structure, oversized type, tactile borders, hard offset shadows, grain, and deliberate imperfection. See [anti-grid brutalism](https://bubble.io/blog/web-design-trends/), [neo-brutalist mobile UI](https://designsignal.ai/articles/neo-brutalist-mobile-app-design), and [retro/brutalist field guide](https://www.setproduct.com/blog/retro-brutalist-ui-design-2026).
- Motion should be concentrated in moments that matter, not sprayed everywhere. CAP uses motion for turn transitions, answer reveals, score pops, and the winner moment, and respects `prefers-reduced-motion`.
- Mobile-first is non-negotiable: one-hand reach, 44px minimum targets, 16px minimum input text, safe-area insets, no hover-only affordances.

### 2.3 Technical signals

- Socket.IO provides room management, reconnection, acknowledgements, and automatic fallback. A server-authoritative state machine prevents cheating and keeps clients synchronized. Sources: [Socket.IO React guide](https://socket.io/how-to/use-with-react), [Socket.IO reconnection discussion](https://github.com/socketio/socket.io/discussions/5284).
- Cloudflare Quick Tunnels provide a public HTTPS URL with no account and explicitly support WebSockets, at the cost of uptime guarantees and a URL that changes when the process stops. This is ideal for a live preview and not for permanent production. Source: [Cloudflare Quick Tunnels docs](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
- Render's free web service supports WebSockets but spins down after 15 minutes of inactivity and can take about a minute to wake. Any permanent deployment must account for cold starts and in-memory room loss. Sources: [Render free tier](https://render.com/docs/free), [Render WebSockets](https://render.com/docs/websocket).
- Deployment v1 is a single Node service that serves the built client and the Socket.IO endpoint. This avoids CORS, split deployments, and serverless WebSocket limits. A Dockerfile and Render blueprint are included for a permanent host.

---

## 3. Problem and opportunity

### Problem
Remote friend groups want a shared activity that starts in seconds, works on the phones they already have, and does not require one person to own a console game, share a screen, or explain a rulebook. Existing options are either TV-dependent, account-heavy, or visually generic.

### Opportunity
Build a single-purpose, instantly joinable social game with a distinctive brand and a tight loop. The category is familiar enough that players understand the premise in one sentence, but the presentation and pace can feel unmistakably current.

### Jobs to be done
- "I want to turn a dead group chat into a 10-minute shared experience."
- "I want to be funny and a little devious in front of my friends."
- "I want to feel clever when I spot the truth, and outraged when I get fooled."
- "I want to start playing before the group loses interest."
- "I want a reason to do it again next week."

---

## 4. Goals, non-goals, and principles

### Goals
1. Two players on separate devices can create and join a room in under 30 seconds.
2. A new player can understand the rules from the first screen without external explanation.
3. A full 5-round match completes reliably in 6-9 minutes.
4. Truth and author data never leak before the reveal.
5. Scoring is deterministic, visible, and defensible.
6. Disconnects and refreshes do not destroy a match.
7. The experience feels designed for phones and for the current moment, not like a generic dashboard.
8. The game is publicly reachable and can be shared with a link.
9. The result screen creates a natural rematch or share action.

### Non-goals for v1
- Accounts, profiles, friends lists, or persistent progression.
- Voice or video chat inside the game.
- Public matchmaking with strangers.
- Spectator/audience mode or a shared big-screen view.
- User-created prompt packs.
- Native iOS/Android apps.
- Real-money purchases, ads, or battle passes.
- Detailed analytics or ad-tech tracking.
- Supporting more than 8 players in a single room.

### Product principles
- **One sentence to play.** The premise and loop fit in a single line.
- **The room is the hero.** The code, the players, and the shared moment dominate the interface.
- **Fast is a feature.** Every unnecessary confirmation, modal, and second is a bug.
- **Designed for the thumb.** Primary actions live in the lower third of the screen.
- **Never leak the trick.** The server withholds truth and authorship until reveal.
- **End clean.** A match has a real finish line. Retention comes from wanting another round, not from being trapped in one.
- **Make the lie feel valuable.** The worst outcome should still produce a funny story.

---

## 5. Target players

### Primary: The remote game-night group (20-35)
Four to six friends on a Discord call, scattered across cities. They have 10-20 minutes, want something nobody has to buy or set up, and will happily make each other laugh by being wrong. They share screenshots and results in the group chat.

### Secondary: The long-distance couple or duo (18-40)
Two people who want a quick, playful activity on a call. CAP must work smoothly with exactly two players, including a fair voting model and a satisfying winner.

### Tertiary: The college/common-room group (18-24)
Three to eight people in the same room but on their own phones. The game should still work without a shared screen. The visual language should feel current enough to post.

### Anti-persona
- Competitive players looking for deep strategy or ranked ladders.
- Large stream audiences needing audience participation in v1.
- Children under 13. The tone is playful but the content can involve mild innuendo and user-written lies. v1 targets 13+ with private rooms and host controls.

---

## 6. Positioning and brand

### Name
**CAP.** Double meaning: a lie ("that's cap") and the act of putting a lid on an answer ("lock it in"). Short, sayable, ownable, and native to current internet language without being a cringe meme.

### Tagline
**Everyone's lying. Find the truth.**

### Brand personality
Dry, quick, confident, a little chaotic. The voice of the friend who exposes the group chat screenshot but still helps you move the couch. Never earnest-corporate. Never try-hard slang.

### Visual direction: "Acid editorial"
A warm paper surface floating on near-black, accented with acid lime and signal blue. Heavy 2px borders, generous 24px radii, hard offset shadows, oversized display type, monospaced labels, grain, sticker-like cards, and a crawling ticker. It should feel like a late-night game-show poster designed by an independent studio, not a SaaS dashboard.

### Palette
| Token | Hex | Use |
|---|---|---|
| Ink | `#10100E` | App background, primary text on paper |
| Paper | `#F3EFE3` | Cards, inputs, primary surfaces |
| Acid | `#D9FF43` | Primary CTA, truth state, focus |
| Signal | `#5B5BFF` | Secondary highlights, links, player accents |
| Flare | `#FF6B4A` | Lies, warnings, energy accents |
| Muted | `#A6A296` | Secondary text, metadata |
| Hairline | `rgba(243,239,227,0.16)` | Dividers on dark surfaces |

Color is never the only indicator of meaning. Truth also carries a label; a selected option also carries a checkmark and border.

### Typography
- Display: **Bricolage Grotesque** variable, 700-800. Oversized, tight tracking, used for headlines, scores, and room codes.
- UI/body: **Inter** variable, 400-700. Legible at 14-18px on phones.
- Labels/code: **DM Mono**, 400-500. Room codes, categories, counters, and small metadata.

### Motion
- Tap feedback: 120-180ms.
- Card transitions: 220-320ms with a slight spring.
- Answer reveal: 450-700ms per beat with a short suspense delay.
- Winner: confetti burst plus a score count-up.
- Reduced motion: replace transforms, confetti, and count-ups with instant state changes and fades.

### Sound
Synthesized via the Web Audio API, no audio files: soft tick, lock-in thunk, reveal riser, correct ding, lie thud, win arpeggio. Default on after first interaction, with a persistent mute toggle. Never autoplay before a gesture.

---

## 7. Game design

### 7.1 Player count and room model
- 2-8 players per room.
- Every player uses their own browser/device.
- One player is the host. The host creates the room and can start the match, kick players in the lobby, rematch, or return everyone to the lobby.
- Host migration is automatic if the host disconnects.
- A room supports late joining only in the lobby or after a match, not mid-round. A disconnected player can reconnect to their existing seat mid-match with a private session token.

### 7.2 Match structure
- One match = 5 rounds.
- Rounds 1-4 use the standard point values.
- Round 5 is the Final Cap, worth 3x points.
- After the Final Cap, the match ends and the result screen appears.
- The room persists after the match so the group can rematch immediately or return to the lobby for new players.

### 7.3 Round loop
1. **Prompt.** A true but strange fact appears with one answer missing.
2. **Write.** For 60 seconds, every player writes a fake answer that sounds believable. Answers are 1-60 characters. Players cannot submit the real answer or duplicate another player's lie.
3. **Lock.** A player locks in once. They can edit before locking. Submissions are private until the vote.
4. **Vote.** All lies plus the real answer are shuffled. Players have 25 seconds to vote for the answer they believe is true. A player cannot vote for their own lie. Votes are private.
5. **Reveal.** Answers are revealed one by one with authors and vote counts. The truth is exposed. Points are awarded with a visible breakdown.
6. **Next.** After a short hold, the next round begins automatically. The host can advance early. The final reveal leads to the result screen.

### 7.4 Answer and vote rules
- A lie must be unique within the round after normalization: trimmed, lowercased, punctuation-collapsed, whitespace-collapsed.
- A lie that equals the real answer is rejected. The error message must not confirm that the answer is correct; it says "That one is already on the board. Cap harder." This prevents an accidental duplicate without explicitly leaking the truth.
- A duplicate of another player's lie is rejected with "Someone already capped that. Try another."
- If a player does not submit before the timer ends, a curated "house cap" for that prompt is submitted on their behalf and labeled as an auto-cap at reveal. This keeps the round moving and never stalls a two-player match.
- If a player does not vote before the timer ends, they cast no vote and earn no truth points that round.
- A player's own lie is visibly labeled "YOUR CAP" during voting and is disabled.
- With two players, both players may vote for the truth or for the other player's lie. There is no self-vote and no tie-breaking vote.
- If only one connected player remains mid-match, the game pauses until another player reconnects. Timers freeze and resume with the original remaining time.

### 7.5 Scoring
Base values:
- **Found the truth:** +1,000.
- **Each player fooled by your lie:** +500 per vote.
- **Perfect Cap:** +1,000 if every other player voted for your lie.

Round multipliers:
| Round | Multiplier |
|---|---|
| 1 | 1x |
| 2 | 1x |
| 3 | 2x |
| 4 | 2x |
| 5 (Final Cap) | 3x |

All points in a round are multiplied by that round's multiplier.

Example, 4 players, round 3 (2x):
- You vote for the truth: +1,000 base.
- Your lie receives 2 votes: +1,000 base.
- Your lie receives every other player's vote: Perfect Cap +1,000 base.
- Round total: 3,000 base x 2 = **6,000**.
- If you did not find the truth but your lie fooled 3 players with a Perfect Cap: 1,500 + 1,000 = 2,500 base x 2 = **5,000**.

Clarifications:
- The author can still vote for the truth. A Perfect Cap and a truth find can happen in the same round for the same player.
- A player who did not vote cannot earn truth points.
- An auto-cap can receive votes and score for its author, but it is labeled "AUTO-CAP" at reveal.
- If nobody finds the truth, the round has no truth points; the reveal announces "The room got capped."
- Scores never go negative.

### 7.6 Winner and tie-break
After Round 5, the player with the highest total wins. Ties are resolved in this order:
1. Most rounds where the player found the truth.
2. Most total votes earned by the player's lies.
3. Most Perfect Caps.
4. Shared victory. The result screen shows co-winners rather than inventing a tiebreaker.

### 7.7 Awards
The result screen includes three optional awards:
- **The Truth Seeker:** most rounds finding the truth.
- **The Biggest Liar:** most votes earned by lies.
- **The People's Cap:** most Perfect Caps, or if none, the single lie with the most votes.

Awards are cosmetic. They do not affect the winner.

### 7.8 Player-facing rules copy
This is the canonical in-game rules text:

> **How to play CAP**
> 1. You get a real fact with a missing answer.
> 2. Everyone writes a lie that sounds true.
> 3. All lies plus the truth get shuffled.
> 4. Vote for the answer you think is real. You cannot vote for your own lie.
> 5. Find the truth: +1,000. Every player fooled by your lie: +500. Fool every other player for a Perfect Cap: +1,000.
> 6. Five rounds. The Final Cap is worth 3x. Highest score wins.
>
> 2-8 players. One phone each. No download. No account. Bring your worst friends.

---

## 8. Content strategy

### 8.1 Prompt format
Each prompt is a real, verifiable fact with one answer removed:
- `text`: the fact with a `_____` blank.
- `answer`: the truth, ideally 1-30 characters.
- `decoys`: 3 curated plausible lies, used for auto-caps and quality control.
- `category`: Animals, Food, Words, History, Geography, Space, Tech, Human, etc.
- `sourceLabel`: human-readable source name.
- `sourceUrl`: a public reference that supports the fact.
- `funFact`: optional one-sentence context for the reveal.

Example:
> A group of flamingos is called a _____.
> Truth: flamboyance
> House caps: ballet, parade, congress
> Source: Merriam-Webster

### 8.2 Content rules
- Every prompt must be factually supportable by the cited source. "Sounds true" is not enough.
- Answers must be interesting, concrete, and short enough to type and scan.
- Prompts must not be answerable from the prompt alone.
- Avoid politics, personal medical advice, gore, sexual content, and facts that punch down at a group of people.
- Avoid facts that are commonly known or already viral, because the round becomes a memory test.
- Prefer facts that produce a "wait, what?" reaction and a fun reveal.
- Each prompt needs at least 3 decoys that are plausible but not the truth.
- Do not use a prompt if the only correct answer is a long phrase that is hard to read on a phone.

### 8.3 v1 library
- Minimum: 30 fact-checked prompts across at least 6 categories.
- A match samples 5 without repeats.
- A room should not see a prompt again until the library has cycled.
- Content is shipped as versioned JSON with IDs, so prompts can be corrected without changing the engine.
- Sources are shown on the reveal screen as a small "Fact check" link.

### 8.4 Content QA
- Two-person review: one for factual accuracy, one for tone and playability.
- Verify each source link before launch.
- Playtest each prompt at least once with 3+ players.
- Track per-prompt stats later: truth-find rate, average votes on lies, skip rate.
- Retire prompts with a truth-find rate above 80% (too easy) or below 15% (too obscure).

---

## 9. Experience and UX

### 9.1 Screen map
1. **Home / Create or Join**
   - Oversized wordmark, tagline, primary "Create a room" CTA, secondary "Join with a code" CTA.
   - Micro-demo fact card to teach the premise visually.
   - "2-8 players / 1 phone each / about 7 min" strip.
   - Rules link, sound toggle, room count if available.
2. **Player setup**
   - Display name and glyph avatar.
   - Name is remembered locally.
   - Create or join action, with inline validation.
3. **Lobby**
   - Room code in a ticket card, copy code, copy link, native share.
   - Player list with host badge, avatars, connection state.
   - Host: start button, kick controls, rules peek.
   - Guests: "Waiting for the host" state and a nudge to share the room.
4. **Writing**
   - Round and multiplier chip.
   - Prompt card with the blank highlighted.
   - Input with character count and examples of the tone.
   - Lock button in the thumb zone.
   - Submitted state with live progress ("4 of 6 liars locked in") and rotating tips.
5. **Voting**
   - Prompt remains visible in condensed form.
   - Answer cards A-F, one per lie plus the truth.
   - Own answer disabled and labeled.
   - Selection state, confirm button, then locked state.
   - Reaction dock.
6. **Reveal**
   - Sequential answer reveal with author, vote count, and correct/incorrect treatment.
   - Score events and a round leaderboard.
   - Truth + fun fact + source.
   - Auto-advance countdown, host skip.
7. **Results**
   - Podium, winner(s), full score table.
   - Awards.
   - Share result, rematch (host), back to lobby (host), leave.
8. **Rules modal**
   - The canonical rules above, readable on one phone screen.

### 9.2 First-time player path
1. Opens a shared link with a room code prefilled.
2. Adds a name and picks a glyph.
3. Lands in the lobby and sees the room code and a one-line explanation.
4. Host starts.
5. Round 1 writing screen includes a one-time inline hint: "Write the most believable lie. Not the truth."
6. The first vote screen includes a one-time hint: "One of these is real. Choose it."
7. Hints are dismissible and never repeat for that session.

### 9.3 Lobby and sharing
- Room code alphabet excludes ambiguous characters: `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, 5 characters.
- Copy link uses the current origin with `?room=CODE`.
- Native share via `navigator.share` when available; fallback copies a message.
- Code is uppercase and readable in DM Mono with generous letter spacing.
- A QR code is out of scope for v1 because remote play is the primary use case.

### 9.4 Connection and recovery
- On load, the client attempts to restore any saved room session for the code in the URL or local storage.
- A refresh or brief network drop restores the same player, score, submitted lie, and vote.
- Disconnected players remain in the room for 2 minutes, marked with a signal state.
- If fewer than 2 players are connected during a live round, the phase pauses and displays "Waiting for the room." The timer resumes from its remaining value when enough players return.
- If a player intentionally leaves, the host can continue. The room is cleaned up after 2 hours of inactivity.
- If the server restarts, rooms are lost. The client shows a clear "This room ended" state and offers to create a new one. This is acceptable for v1; persistence is a future roadmap item.

### 9.5 Error states
- Invalid code: inline message, input shake, focus restored.
- Room full: clear message with an option to create a room.
- Game in progress: explain that the round is live and that the player needs a reconnect link or should wait for the lobby.
- Duplicate name: suggest a variant.
- Truth/duplicate lie: playful, non-leaking error.
- Connection lost: persistent banner; do not clear the current screen.
- Server error: a human-readable toast plus a retry action.
- Timer expiry: never a dead end; auto-submit or skip as defined.

---

## 10. Modern engagement design

### 10.1 Core engagement loop
Curiosity (weird fact) -> creative expression (write a lie) -> social risk (will anyone believe me?) -> suspense (vote reveal) -> variable reward (did I fool them? did I find it?) -> status (score, streak, awards) -> rematch (new prompts, same group).

### 10.2 Hooks
- **Curiosity gap:** the fact is strange enough that players want the answer even if they lose.
- **Creative ownership:** the lie is player-authored, so the result is personal and funny.
- **Near-miss drama:** seeing that two people voted for your lie is inherently motivating.
- **Perfect Cap:** a rare, legible achievement that creates a story.
- **Cosmetic truth streak:** a flame or tally for consecutive truth finds. No point bonus, no loss penalty.
- **Final Cap multiplier:** a comeback window and a reason to stay to the end.
- **Shareable result:** a spoiler-free card with winner, awards, and a "beat my score" link.
- **One-tap rematch:** the group can go again before the energy drops.
- **Presence:** live submission counters, reaction bursts, and "waiting for" states make remote players feel together.

### 10.3 Ethical guardrails
- A match ends after five rounds. No infinite scroll, no daily obligation.
- No accounts, no push notifications, no artificial scarcity, no paid advantage.
- Streaks are cosmetic and do not punish absence.
- No loot boxes or gambling mechanics.
- No public profiles or leaderboards in v1.
- Aggregate server stats only; no personal data sold or shared.
- Player names and lies are visible only inside the private room.
- Host can kick in the lobby. Inputs are length-limited and rendered as text.

### 10.4 Share card
After the match, "Share result" produces a compact text block plus a link:
```
CAP - Everyone's lying.
Winner: Maya (12,500)
Biggest Liar: Dev (7 votes)
Truth Seeker: Ana (4/5)
5 rounds. 6 liars. 1 truth.
Play: [link]
```
The native share sheet is used when available. If the user copies the card, the link creates a fresh room or opens the landing page; it must never expose a live room's private session.

---

## 11. Visual design specification

### 11.1 Layout system
- Mobile-first, max game width 560px, centered. Desktop home uses a 2-column editorial layout; the game itself stays as a focused column with ambient decorative elements outside it.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64.
- Radii: cards 24px, buttons 16px, chips 999px, inputs 16px.
- Borders: 2px solid Ink on paper surfaces; 1px hairline on dark surfaces.
- Shadows: hard offset `4px 4px 0` or `6px 6px 0`, never soft blur for primary cards. One ambient shadow is allowed on modals.
- Grain: a subtle SVG noise overlay at 3-5% opacity, fixed, pointer-events none.
- Background: Ink with an oversized, low-contrast typographic texture ("CAP", "LIE", "TRUTH") that does not compete with content.

### 11.2 Key components
- **Primary button:** Acid background, Ink text, 2px Ink border, hard shadow, press translates 2px.
- **Secondary button:** Paper background, Ink text, same border.
- **Ghost button:** transparent with hairline border.
- **Room code ticket:** Paper card, dashed perforation, oversized DM Mono code, offset Acid/blue stickers.
- **Prompt card:** Paper with a category label, large fact text, the blank replaced by a thick Acid underline and a pulsing caret.
- **Answer card:** Paper with a letter chip, large answer text, selected state with Acid fill and a check.
- **Player totem:** a colored circle with a glyph avatar, name, score, and connection dot.
- **Timer:** a thin horizontal bar plus a MM:SS label; the bar turns Flare under 10 seconds. Never rely on color alone; the number remains visible.
- **Ticker:** a slow marquee of dry one-liners at the bottom of the home screen, paused under reduced motion.
- **Reaction dock:** four buttons (skull, cry, eyes, fire) that spawn a short floating burst with the sender's name color. Rate-limited.

### 11.3 Responsive behavior
- 320px minimum supported width.
- Primary actions remain reachable with one thumb.
- Inputs use 16px text to prevent iOS zoom.
- Safe-area padding for notches and home indicators.
- Landscape phones use a compact prompt header and a scrollable answer list.
- Desktop supports keyboard: Enter to submit, arrow keys to move through answers, Enter to select, Escape to close modals.
- No information is conveyed by hover alone.

### 11.4 Accessibility
- WCAG 2.2 AA contrast for text and controls.
- Visible focus ring: 3px Signal outline with 2px offset.
- All icon-only buttons have accessible labels.
- Phase changes announced through a polite live region.
- Timer is not the only way to know a deadline; text labels accompany it.
- `prefers-reduced-motion` removes confetti, springs, and sliding transitions.
- Sound can be muted at any time, and the preference persists.
- Forms have labels, not just placeholders.
- Error messages are associated with their inputs.

---

## 12. Technical architecture

### 12.1 Stack
- **Client:** React + TypeScript + Vite. Custom CSS design system. No UI framework. `canvas-confetti` for the win moment. Socket.IO client.
- **Server:** Node.js 22 + TypeScript + Express + Socket.IO. Server-authoritative room engine. Zod validation. In-memory room store. Helmet security headers.
- **Shared:** TypeScript types for room state and socket events, plus the content dataset and avatar definitions.
- **Tests:** Vitest for the engine; Socket.IO client integration tests; Playwright for a two-browser happy path and screenshots.
- **Build:** Vite builds the client to `dist/client`; `tsc` builds the server to `dist/server`; `npm start` runs the server and serves the client.
- **Deployment:** single Node web service. Cloudflare Quick Tunnel for the live preview. Dockerfile and `render.yaml` for permanent hosting.

### 12.2 Room state machine
```
lobby
  -> writing (round 1)
  -> voting
  -> reveal
  -> writing (rounds 2-4)
  -> voting
  -> reveal
  -> writing (round 5, Final Cap)
  -> voting
  -> reveal
  -> ended
```
- `lobby` allows joining/leaving, avatar/name changes before start, host start.
- `writing` allows one lie submission per player; auto-cap on timeout.
- `voting` allows one vote per player; no self-vote; auto-skip on timeout.
- `reveal` is server-authored and immutable. It contains the truth, authors, votes, per-player deltas, and the round scoreboard.
- `ended` contains final standings and awards. Host can rematch or return to the lobby.

### 12.3 Server responsibilities
- Generate room codes and session tokens.
- Validate every action against the current phase, player identity, and room membership.
- Keep the truth and authorship private until the reveal.
- Shuffle answer options server-side with a cryptographically strong shuffle.
- Compute timers and transitions with a single scheduler per room.
- Sanitize and normalize names, lies, and reactions.
- Broadcast personalized state snapshots, not a single raw state with secrets.
- Handle reconnect, host migration, and pause/resume.
- Clean up inactive rooms and prevent unbounded growth.

### 12.4 Socket event contract (v1)
Client to server:
- `room:create` `{ name, avatar }`
- `room:join` `{ code, name, avatar, token? }`
- `room:reconnect` `{ code, token }`
- `room:start`
- `room:kick` `{ playerId }`
- `room:leave`
- `round:lie` `{ text }`
- `round:vote` `{ optionId }`
- `room:rematch`
- `room:lobby`
- `reaction` `{ emoji }`
- `room:skipReveal` (host only, after a minimum reveal hold)

Server to client:
- `state` personalized snapshot
- `error` `{ code, message }`
- `reaction` `{ playerId, name, avatar, emoji }`
- `room:closed` `{ reason }`

### 12.5 State snapshot shape (conceptual)
```ts
type PublicPlayer = {
  id: string;
  name: string;
  avatar: number;
  connected: boolean;
  isHost: boolean;
  score: number;
  truthFinds: number;
  votesFooled: number;
  perfectCaps: number;
  hasSubmitted: boolean;
  hasVoted: boolean;
};

type PublicState = {
  code: string;
  phase: "lobby" | "writing" | "voting" | "reveal" | "ended";
  round: number;
  totalRounds: 5;
  multiplier: 1 | 2 | 3;
  serverNow: number;
  phaseEndsAt: number | null;
  paused: boolean;
  players: PublicPlayer[];
  you: { id: string; isHost: boolean; lieSubmitted: boolean; voteOptionId: string | null };
  prompt?: { category: string; text: string };
  options?: { id: string; text: string; isMine: boolean }[];
  reveal?: {
    truth: string;
    sourceLabel: string;
    sourceUrl: string;
    funFact?: string;
    answers: {
      id: string;
      text: string;
      isTruth: boolean;
      authorName?: string;
      authorAvatar?: number;
      autoCap?: boolean;
      votes: string[];
      perfect: boolean;
      points: number;
    }[];
    deltas: { playerId: string; points: number; truth: boolean }[];
    headline: string;
  };
  standings?: { playerId: string; score: number }[];
  awards?: { key: string; label: string; playerIds: string[] }[];
  autoAdvanceAt?: number | null;
};
```
The voting snapshot must not contain `isTruth`, `authorId`, `authorName`, or vote counts. The author of the player's own option may be marked solely with `isMine`, which is safe.

### 12.6 Scoring engine
```ts
const BASE_TRUTH = 1000;
const BASE_FOOLED = 500;
const BASE_PERFECT = 1000;
const MULTIPLIER = [1, 1, 2, 2, 3];

for each player:
  truth = vote.optionId === truthOptionId
  fooledCount = answers authored by player -> votes.length
  perfect = fooledCount === eligibleVotersForThatLie
  base = (truth ? BASE_TRUTH : 0)
       + fooledCount * BASE_FOOLED
       + (perfect ? BASE_PERFECT : 0)
  delta = base * MULTIPLIER[round - 1]
```
Eligible voters for a lie = all players except the author. A disconnected player who did not vote counts as not voting but is still an eligible voter, so a Perfect Cap requires the whole room minus the author to vote for the lie. If the server pauses due to low connectivity, the round does not resolve until play resumes or the room is ended.

### 12.7 Reconnect and identity
- On create/join, the server returns a `playerId` and a 32-byte random session token. The token is stored in `localStorage` keyed by room code.
- Reconnect rebinds the socket to the existing player. The old socket is disconnected.
- Tokens are validated against the server-side player record and are never broadcast.
- If a token is invalid and the room is in progress, the join is rejected with a clear message.
- On intentional leave, the token is cleared and the player is removed if the room is in the lobby. Mid-game leave marks the player as gone; their lie remains in the round, but they cannot vote or score further.
- Host migration: if the host disconnects, the connected player with the earliest join time becomes host. The old host does not automatically regain host on reconnect.

### 12.8 Validation and abuse resistance
- Zod schemas for all actions.
- Max name length 16, min 2; Unicode letters/numbers/spaces/underscore/hyphen, no control characters or angle brackets.
- Lie length 1-60; single line; no control characters; collapse whitespace; reject duplicates/truth.
- Reaction must be in an allowlist.
- Rate limits per socket: 12 actions/10s; 1 reaction/800ms; join attempts per IP 20/min; room creates per IP 10/min.
- Max 500 active rooms on the v1 instance; reject with a friendly busy state when full.
- Socket.IO `maxHttpBufferSize` 10 KB.
- Server never exposes tokens, truth, or authors before reveal.
- Static assets served with immutable caching; HTML no-cache.
- CSP: self, `wss:`, `ws:` for development, `data:` images, self-hosted fonts. No third-party scripts.
- No account data, no password, no email.

### 12.9 Performance targets
- First contentful paint under 1.5s on a mid-range phone over 4G for the built app.
- JS bundle under 250 KB gzipped (excluding fonts).
- Client-to-client state latency under 250ms on typical broadband.
- No layout shift on font load (use `font-display: swap` with matched fallback metrics or preload).
- Memory per room under 50 KB for a 5-round match; rooms cleaned up after 2 hours.
- Server handles at least 100 concurrent rooms / 400 players on a small instance for v1.

### 12.10 Deployment
- **Live preview:** local server + Cloudflare Quick Tunnel. Temporary, no account, WebSocket-compatible, URL changes on restart.
- **Permanent:** Render free web service via `render.yaml`, or any Docker host. Note the free tier's 15-minute idle spin-down and one-minute cold start, and that in-memory rooms do not survive restarts.
- **Not recommended for v1:** Vercel serverless functions for the Socket.IO server. Persistent WebSocket support is not a good fit for the v1 architecture.
- **Health:** `GET /api/health` returns status, uptime, room count, and player count. `GET /api/stats` returns aggregate room/player counts for the landing page.
- **Environment variables:** `PORT`, `NODE_ENV`, `ROOM_TTL_MS`, `MAX_ROOMS`, `WRITING_MS`, `VOTING_MS`, `REVEAL_MS`, `ALLOWED_ORIGIN`.

---

## 13. Analytics and success metrics

v1 uses server-side aggregate counters only. No third-party analytics, cookies, or personal data. If product analytics are added later, they must be privacy-friendly, minimal, and disclosed.

### North star
**Completed matches per active room**, with rematch rate as the leading indicator of fun.

### Funnel
Landing view -> room create/join -> 2+ players in lobby -> match started -> match completed -> rematch or share.

### v1 targets
| Metric | Target |
|---|---|
| Join-to-start time | under 45s median |
| Match completion | 80%+ of started matches |
| Median match length | 6-9 minutes |
| Rematch rate | 20%+ of completed matches |
| Share/copy result rate | 10%+ of completed matches |
| Voting error rate | under 1% |
| Reconnect success | 90%+ within 60s |
| Room join failure | under 3% |
| Accessibility audit | no critical or serious issues |

### Events (server-side, aggregate)
- room created, room joined, room start attempt, game started
- round started, lie submitted, auto-cap triggered, vote submitted
- round revealed, game completed
- rematch started, lobby returned, result shared (client counter)
- socket reconnect success/failure
- validation rejection by code

No raw names or lie text in analytics.

---

## 14. Testing and QA

### Automated
- **Engine unit tests:** room creation, join validation, name collision, host migration, phase transitions, duplicate/truth rejection, auto-cap, auto-vote, scoring, perfect cap, multipliers, final round, tie-break, awards, pause/resume, room expiry.
- **Socket integration tests:** three clients play a full match; assert state sync, no truth/author leakage during voting, correct final scores, reconnect restores the same player, and a second tab cannot hijack a session.
- **Browser smoke test:** Playwright opens two isolated browser contexts, creates a room, joins, starts, plays a full short-timer match, checks the winner and rematch.
- **Validation tests:** oversized payloads, invalid emoji, invalid room codes, spoofed host actions, duplicate votes, votes for own lie, joining mid-game without a token.
- **Load test:** 100 rooms with 4 players using scripted Socket.IO clients; monitor transitions and memory.

### Manual device matrix
- iPhone Safari (latest and one prior major).
- Android Chrome (latest).
- Desktop Chrome, Safari, Firefox.
- 320px viewport, 390px, 430px, tablet, desktop.
- Private/incognito window for a second player.
- Slow 3G / offline transition during writing and voting.
- Screen reader pass on the lobby, writing, voting, reveal, and results.
- Reduced motion and muted sound.
- Two-player match specifically.

### Acceptance criteria
1. Two separate browser contexts can join the same room from different sessions.
2. The host can start when at least two players are present.
3. A full 5-round match can be completed without a manual page refresh.
4. The truth is not present in voting state sent to clients.
5. Authorship is not present in voting state except for a player's own option.
6. Scores match the published formula and multiplier table.
7. A refresh mid-round restores the player's seat and state.
8. A new player cannot join a live round without a valid reconnect token.
9. The result screen shows the correct winner and awards.
10. The game is reachable from a public URL on a different network.
11. Rules are accessible in-game and understandable without external help.
12. Core screens pass a mobile viewport and reduced-motion check.

---

## 15. Launch plan

### Build
1. Scaffold the Vite + React client and Express + Socket.IO server.
2. Implement the server state machine and scoring with tests.
3. Curate and fact-check 30 prompts.
4. Build the design system and all screens.
5. Wire reconnect, pause/resume, host migration, and room cleanup.
6. Run automated tests and a multi-browser QA pass.
7. Fix the top usability issues found in playtesting.
8. Build for production and run the server locally.
9. Expose via Cloudflare Quick Tunnel and verify the public URL on a separate network.
10. Ship README, rules, source links, deployment instructions, and a result share flow.

### Live preview policy
The Quick Tunnel URL is a real, publicly reachable URL for the duration of the process. It is suitable for the project's "live URL" requirement and for immediate testing. It is explicitly temporary. For a permanent home, deploy the included Docker/Render setup, or attach a named Cloudflare Tunnel and a stable domain.

### Rollout checklist
- [ ] Production build served by the Node server.
- [ ] Health endpoint verified.
- [ ] Socket connection verified over HTTPS/WSS.
- [ ] Two-device test from outside the local network.
- [ ] Mobile Safari and Chrome smoke test.
- [ ] Rules and source links reviewed.
- [ ] No secrets or tokens in the client bundle.
- [ ] OG title, description, and social image.
- [ ] 404 and room-closed states.
- [ ] Accessibility and reduced-motion pass.
- [ ] Result share text reviewed.
- [ ] README with run, deploy, and test commands.

---

## 16. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Inappropriate player lies | Medium | Medium | Private rooms, host kick, length limit, no public discovery, report/block on roadmap. Consider a lightweight profanity filter post-v1. |
| Factual error in a prompt | Medium | High | Source every prompt, two-person review, visible fact-check link, easy content corrections via versioned JSON. |
| Prompt too easy or too obscure | High | Medium | Playtest, per-prompt telemetry later, retire outliers, maintain a broad category mix. |
| Host leaves | Medium | Medium | Automatic host migration; host controls also available on results. |
| Disconnect during a round | Medium | Medium | Session tokens, reconnect, pause when fewer than 2 connected, auto-cap for absent players. |
| Server restart loses rooms | Medium | Medium | Clear "room ended" state; v2 Redis/persistence; note on deployment. |
| Quick Tunnel goes down | High | High for live link | Keep the process alive; document the temporary nature; include permanent deploy config. |
| Room code guessing | Low | Low | 5-char code from a 32-char alphabet, rate limits, private state, no public directory. |
| Scope creep | Medium | High | v1 is one game mode, 5 rounds, 2-8 players, no accounts, no chat, no audience. |
| Visual style hurts readability | Low | High | Test contrast, cap display type sizes, body copy in Inter, no color-only states. |
| Low rematch rate | Medium | Medium | Tight 5-round pacing, Final Cap comeback, awards, share card, one-tap rematch, prompt variety. |

---

## 17. Roadmap

### v1 (this build)
- One game mode: CAP.
- 2-8 player rooms, 5 rounds, scoring, awards, rematch.
- 30 fact-checked prompts.
- Reconnect, host migration, pause/resume.
- Acid-editorial responsive UI, sound, motion, reactions, result sharing.
- Live Cloudflare URL and deployable Docker/Render build.

### v1.1 (post-launch)
- 50+ additional prompts and a prompt feedback button.
- Host settings: round count (3/5/7), writing timer, custom room name.
- "Lie for me" fallback suggestions for writers' block.
- More awards and a shareable image card.
- Room chat with preset messages.
- Streamer/big-screen view.

### v2
- Daily public prompt with a global truth-find percentage (Wordle-style, no accounts required).
- Async "play later" rooms.
- Audience mode (vote without writing).
- Prompt packs and themed nights.
- Optional accounts for persistent stats and friend rooms.
- Redis adapter and multi-instance hosting.
- Localization.

---

## 18. Open questions

1. Should the default writing timer be 60s or 75s after live playtests? Start at 60s; tune based on median submission time.
2. Should an auto-cap be eligible to score? v1 says yes, labeled clearly, to avoid stalling and to keep two-player rounds whole. Revisit if it feels unfair.
3. Is a truth streak cosmetic enough, or does the group want a small score bonus? v1 keeps it cosmetic for clarity.
4. Should results be host-advanced instead of auto-advanced? v1 uses auto-advance with a host skip to keep pace; playtest will confirm.
5. Is 30 prompts enough for launch? It supports six matches without a repeat and is enough for v1; expand immediately after launch.

---

## 19. Definition of done

CAP v1 is done when a group of at least two people, on separate devices and separate networks, can open a public URL, join the same room, read the rules in-app, play five complete rounds with correct and private scoring, see a winner and awards, and start a rematch, with no console errors and no manual server intervention. The URL must be verified in a private window and from a second network. The PRD, README, test commands, deployment config, and source links must be present in the repository.

---

## Appendix A: Research links

- Jackbox Fibbage 4 help: https://games-netflix.helpshift.com/hc/en/57-the-jackbox-party-essentials/faq/1870-what-is-fibbage-4/
- Fibbage game manual (2-8 players, browser controllers): https://dlassets-ssl.xboxlive.com/public/content/a6e22d34-3ccc-4356-9e47-34fa1f074545/GameManual/473295d9-ff38-49ea-bd24-8406953bd760/en-CA/index.html
- Wirecutter best party games 2026: https://www.nytimes.com/wirecutter/reviews/best-party-games/
- GameBuddies browser party games: https://gamebuddies.io/
- Wordle social sharing: https://news.northeastern.edu/2022/01/21/what-makes-wordle-so-g-r-e-a-t/
- Wordle goal-gradient and near-miss study: https://pmc.ncbi.nlm.nih.gov/articles/PMC11487082/
- Ethical streak design: https://uxmag.com/articles/the-psychology-of-hot-streak-game-design-how-to-keep-players-coming-back-every-day-without-shame
- 2026 web design trends: https://bubble.io/blog/web-design-trends/
- Neo-brutalist mobile UI: https://designsignal.ai/articles/neo-brutalist-mobile-app-design
- Retro/brutalist UI field guide: https://www.setproduct.com/blog/retro-brutalist-ui-design-2026
- Socket.IO React guide: https://socket.io/how-to/use-with-react
- Socket.IO reconnection discussion: https://github.com/socketio/socket.io/discussions/5284
- Cloudflare Quick Tunnels: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/
- Render free tier: https://render.com/docs/free
- Render WebSockets: https://render.com/docs/websocket
