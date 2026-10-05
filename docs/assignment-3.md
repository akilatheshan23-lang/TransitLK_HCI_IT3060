# Assignment 3 implementation notes

Sources reviewed: `Assignment 3.pdf` (3 pages) and `IT3060HCI2026_Milestone02_Group_WE_07 (1).pdf` (39 pages), plus the uploaded welcome screenshot. Document instructions describe the assignment; the user's requested implementation scope is the uploaded screen only.

## Stack justification

- React Native and Expo provide a runnable cross-platform mobile application and browser preview using the same UI components.
- TypeScript checks the frontend interfaces and API response types.
- Express provides a small REST boundary with validation, rate limiting and consistent error responses.
- MongoDB follows the report's proposed data model; unique normalized email indexes prevent duplicate accounts and TTL indexes expire sessions.
- SecureStore protects native session credentials; no database URI reaches the mobile bundle.

## Traceability

| Requirement | Prototype | Implementation | Verification |
| --- | --- | --- | --- |
| FR09 account entry | 01 Welcome; 02/03 supporting flows | Welcome actions and register/login sheets; passenger-only account creation, profile read, logout | Registration, login, invalid-input, duplicate, session and role tests |
| FR05 languages | Welcome language controls; 22/32 | Three-language welcome and sheets; local guest preference; authenticated MongoDB preference read/update | API preference persistence and authorization tests; manual UI switching |
| FR06 service alerts | 31 Notifications | Bell opens a feed with honest empty/loading/error states | Public metadata test; manual loading/empty review |
| FR01 GPS / FR10 ETA and crowding | 06 Live map | Not implemented in the requested welcome-screen slice | Pending |

CRUD covered: Create passenger; Read own profile; Update own language; Delete/revoke own session. The welcome screen is an entry surface, not the GPS management interface. Confirm with the lecturer how its supporting sheets count toward the rule requiring at least two CRUD operations per assigned interface; do not claim GPS compliance from this slice.

## Design deviations

1. Account forms use sheets to keep the requested main screen scope.
2. Artwork is recreated as scalable SVG because Figma asset access was denied.
3. Native OS draws system status and navigation areas; no fake clock or notch is rendered.
4. Sinhala appears alongside English/Tamil to support the report's three-language requirement.
5. No fake arrival notifications, journey data, ETA or crowding values are shown.
6. There is no misleading terms-consent checkbox without actual reviewed legal documents.

## Remaining Assignment 3 deliverables

The guideline deadline is 9 October 2026. It requires a working runnable mobile app, at least two CRUD operations per assigned interface, functional test traceability, usability testing with at least five real/proxy users, source repository and setup README, an installable build where applicable, a consolidated report (maximum 35 pages excluding references/appendices), and an individual demonstration.

GPS tracking and alerts are allocated to Weerashingha in the Milestone 02 report. The supplied image is assigned to the account-entry area. This implementation is a starting slice; the actual tracking interfaces still need implementation and testing.

Do not reuse Milestone 02 prototype sessions as evidence of testing this running app. The earlier report has an evidence inconsistency: some sections say tests are unexecuted while Appendix D records four walkthroughs. Resolve this explicitly in the consolidated report. Do not invent a fifth participant, numeric ratings, timings, or quotations.

## Usability test template (not executed)

Recruit at least five participants, use fictional accounts, obtain consent and record device/network context. Ask each participant to identify the app, create an account, sign out and sign in, change language, and explain the notification state. Record unassisted success, time, errors, help, and comments. Retest actual issues after fixes.

| Participant | Device | Task | Success/help | Seconds | Issue | Fix/retest |
| --- | --- | --- | --- | --- | --- | --- |
| P01 | Pending | Pending | Pending | Pending | Pending | Pending |
| P02 | Pending | Pending | Pending | Pending | Pending | Pending |
| P03 | Pending | Pending | Pending | Pending | Pending | Pending |
| P04 | Pending | Pending | Pending | Pending | Pending | Pending |
| P05 | Pending | Pending | Pending | Pending | Pending | Pending |

The guideline allows AI assistance with adaptation and imposes a report AI-content limit. Review, adapt and understand this code and write the report from your own decisions and measured evidence; no AI-detection score is claimed here.
