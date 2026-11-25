# Project memory

## Product intent & audience

- Healthcare SaaS dashboard ("CareVoice AI") with a voice-first AI assistant for doctor booking and appointment management.
- Core features: find-a-doctor, live conversation transcript, smartphone-style voice assistant, appointment management with cancellation and phone-number lookup.
- Audience: patients booking appointments via voice AI.

## Brand personality & voice

- Clinical but approachable; voice assistant feels conversational and human.
- AI assistant labeled "AI Assistant"; user labeled "Patient".

## Visual design & UX direction

- Three-column desktop layout: left ~280px Find a Doctor, centre transcript + phone assistant, right ~280px My Appointments.
- Centre column: transcript at top (height ~38% of available space, capped 200–320px), compact smartphone voice assistant below, vertically centred.
- Smartphone voice assistant: dark navy design, kept compact.
- Transcript bubbles: AI assistant — light bubble, teal label, bot avatar; Patient — navy bubble, user avatar; each with timestamp.
- Existing visual theme, doctor cards, header, colors, and styling preserved across refinements.
- Responsive: left panel hides below `md`, right panel hides below `lg`; no horizontal scroll on desktop.

## Decisions, constraints & rationale

- Refine rather than rebuild; keep working components unchanged unless they conflict with layout goals.
- Transcript given bounded flexible height instead of fixed 220px to stay fully visible.
- Separate patient/AI bubbles improve legibility of conversation flow.
- Side panels fixed ~280px so all three columns fit a standard desktop together.
- Stack: Next.js, Tailwind CSS, shadcn/ui, Lucide React icons (per `.bolt/prompt`).

## Open questions & assumptions

- Assumed "standard desktop" ≥ `lg` breakpoint shows all three columns.
- Phone-number lookup behavior and appointment data source not yet specified.
- Voice assistant interaction flow (beyond visual) not detailed.