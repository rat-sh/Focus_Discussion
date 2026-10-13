# UX rules and review checklist

## Principles
Content first. Calm, dense, code-editor feel. One accent colour. No gradients, glass, sparkle icons or emoji as UI icons.
No dead controls: if it is on screen it works, or it is not on screen.

## Tokens (`src/styles/index.css`)
Semantic names only: `canvas surface raised line fg muted accent danger warn` and state colours `st-focus st-phone st-rest st-lapse st-idle`.
Dark default, light via `data-theme`. Radius 6px. Text minimum 12px. Inputs 16px on phones (prevents iOS zoom).

## Size rules
| | Desktop | Phone |
|---|---|---|
| Button height | 32px | 44px |
| Tap target minimum | n/a | 40px (44px preferred) |
| Room content area | >= 70% width | full width |
| Live room controls | bottom bar, icon over label | same, 5 buttons max |

## Phone patterns (Zoom-like)
- Room: compact header (name, timer, layout, leave), content full width, filmstrip strip, 5-button bottom bar (Mute, Video, Hand, Chat, More).
- Panels (chat, doubts, people, library, music, ranks) open as a bottom sheet. More holds the rest.
- Layouts: Content, Speaker, Gallery. Gallery pages 6 tiles (2x3), swipe or arrows. Desktop gallery 20 tiles (5x4).
- Dialogs become bottom sheets. Safe-area insets respected. `100dvh`, never `100vh`.
- Primary navigation: bottom tabs (Home, Rooms, Focus, Friends, More).

## Every screen must have
Loading skeleton, error with retry, empty state with a next action, keyboard focus ring, labels on icon-only buttons.

## Before merging a change
1. `npm run build` and `npm test` pass.
2. `npm run audit` reports NO ISSUES (horizontal scroll, text < 12px, phone tap targets < 40px, squeezed icons, offscreen elements) on 4 sizes.
3. Look at the screenshots in `/tmp/shots` for desktop and phone. The audit cannot see wrong colours, clipped text or confusing layout.
