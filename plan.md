# KaizenB ideas and improvement plan

Status: proposed work. This file records the user's ideas and a source-code review; application changes below are not implemented.

## 1. Browser tab titles should describe the open page

**User idea:** The current "I lived" tab name is not useful. When a reader opens a post, the browser tab should show that post's title.

Current findings:

- `index.html` has the static title `KaizenBlog — I lived`.
- `src/pages/PostPage.tsx` loads the post but does not update `document.title`. No page title management was found in `src/`.

Planned work:

- [ ] Set the loaded post's browser tab title to its title, matching the reader's request without an automatic brand suffix.
- [ ] Use a loading/fallback title until the post is loaded, including a useful fallback for an untitled draft.
- [ ] Reset the title on navigation, errors, and missing posts so the previous article's title does not linger.
- [ ] Add consistent titles for home, categories, sign-in, the editor, and admin pages. Exact labels for those pages can be decided during implementation.

Acceptance: direct links, reloads, navigation between posts, and browser back/forward all show the correct title. Leaving a post restores the destination page's title.

## 2. Make writing reliable and API calls efficient

**User concern:** The site feels slow and appears to log users out while they are writing. Users must be able to finish a draft without losing work because of token refresh, temporary API errors, or a required sign-in.

### Findings from the current source

| Finding | Evidence | Effect / risk |
| --- | --- | --- |
| Background auth synchronization can unmount the editor | `src/auth/AuthContext.tsx` ignores the auth event type and calls `syncSession` for every event. A session-bearing sync sets global `loading = true`. `src/components/RequireRole.tsx` returns a loading screen instead of its `Outlet` while loading. | A protected editor can unmount during revalidation, including token refresh, even if the session stays valid. Its in-memory form is then lost. This is the highest-priority source-level issue. |
| Profile or admin-user-list errors look like logout | The auth provider fetches `/api/profile`, then `/api/users` for admins, in the same try/catch. Any failure sets the displayed user to `null`. | An unrelated admin-list error, network failure, or server error can remove access to the editor. This path does not itself call Supabase `signOut()`. |
| Initial session loading has two entry points | The auth provider subscribes to auth events and separately calls `getSession()` to start synchronization. | Initialization can overlap and duplicate profile/user-list requests. `requestId` ignores stale results but does not cancel or deduplicate requests. |
| Unsaved drafts live only in component state | `src/pages/PostEditorPage.tsx` stores `form` with `useState`; no draft recovery storage, autosave, or unsaved-navigation protection was found. | Unmounts, refreshes, OAuth redirects, and accidental navigation can discard changes since the last manual save. |
| Changes to the user object can reload the saved post | The editor's loading effect depends on `[slug, user]` and calls `setForm(toInput(post))`. `PostPage` also refetches on `[slug, user]`. | Revalidation can trigger another fetch; in the editor, a response can overwrite unsaved changes even if unmounting is fixed. |
| Signed-in requests repeatedly verify the user and load a profile | `server/apiHandler.ts:getActor` calls Supabase Auth `getUser(token)` and queries `profiles`. Optional-auth routes also do this when a Bearer token is present. | A signed-in public post-list request adds auth and profile operations before its posts query; image-read requests repeat the same checks. Actual latency needs measurement. |
| Story lists fetch full records with no explicit pagination | The list handlers use `select("*")`; `getPostsByCategory` in `src/services/posts.ts` downloads the published list and filters in the browser. | Lists include full bodies, blocks, and image metadata. Payload and rendering costs grow with the data returned; the database API may cap results rather than provide a complete paginated list. |
| Each image component resolves and downloads independently | `getImage` requests `/api/images/read`, then downloads a Blob. `BlogImageView` and `UserAvatar` keep component-local object URLs, with no shared request cache. | Repeated images/avatars and remounts can repeat signing and download work. Auth/profile checks amplify this for signed-in readers. |
| Image uploads run sequentially | The editor awaits `saveImage` for each selected file in a loop. | Selecting several images waits for each upload in turn. Measure before choosing bounded concurrency. |
| API errors lose their status/type | `src/services/apiClient.ts` throws plain `Error` messages and has no explicit timeout or bounded refresh/retry flow. | Callers cannot reliably distinguish expired auth, invalid server configuration, permission errors, and transient failures. Blind retries would risk duplicate writes. |

### What is established and what still needs evidence

- Automatic token refresh and session persistence are already enabled in `src/services/supabaseClient.ts`. Simply enabling refresh again will not address the editor lifecycle problems above.
- Every API request currently calls the browser SDK's `getSession()` to obtain a token. Do not count every such call as an extra HTTP request without inspecting the network trace.
- The earlier production log showed `UNAUTHORIZED_INVALID_API_KEY`, which the backend mislabeled as an expired session. That historical configuration error does not establish the cause of today's interruptions.
- The editor-unmount and error-handling risks are confirmed by code inspection. The precise production lag, frequency of auth events, current timeout settings, and current refresh failures have not been measured or reproduced in this review.
- Extra development requests may also come from React Strict Mode. Compare with a production build before treating all duplicates as production behavior.

### Priority 0: preserve drafts and stop false logout

- [ ] Reproduce a writing session while triggering token refresh, tab switching, slow/offline networking, and a failed profile/admin-list request. Record auth event names, response statuses, and timings without logging tokens or secrets.
- [ ] Separate initial auth loading from background revalidation. Keep the mounted editor and current text through refresh/revalidation; never use cached UI state to bypass backend permission checks.
- [ ] Handle initial session, sign-in, token refresh, sign-out, and account changes explicitly. Deduplicate session initialization and profile loading for the same user.
- [ ] Fetch the people list only where needed, rather than making it a prerequisite for every admin session. An admin-list failure must not clear an otherwise valid user.
- [ ] Preserve the displayed user on transient verification failures and show a retryable connection state. Treat confirmed session loss and revoked permissions distinctly; the backend must continue rejecting unauthorized reads/writes.
- [ ] Add recoverable local drafts with debounced persistence and visible save state. Include title, slug, excerpt, category, text/blocks, image references, removed-image tracking, and editor identity.
- [ ] Scope local drafts to the Supabase project, account ID, and stable post/new-draft ID. Keep a draft recoverable through reauthentication without exposing it to a different signed-in account; support explicit recovery/discard.
- [ ] Guard the editor's post-loading effect against stale responses and user-object changes. Initialize once per intended post/account; never overwrite dirty form state with a background fetch.
- [ ] Persist before a required OAuth redirect and restore after the same account returns. Handle local storage failures visibly and offer a text export/copy fallback.
- [ ] Add debounced server draft saves after local recovery is reliable. Keep typing in the editor, show saving/saved/offline/failed states, and prevent older save responses from replacing newer text.
- [ ] Define safe autosave behavior for published posts: editing must not silently publish changes or demote the live article. Preserve manual publication controls.
- [ ] Do not delete images still referenced by recoverable drafts. Coordinate cleanup with confirmed saves and explicit draft discard.
- [ ] Warn on navigation with changes not durably saved. Do not rely on a last-second unload request as the only protection.

Acceptance:

- Token refresh and background revalidation do not unmount the editor or replace typed text.
- Temporary network/profile/admin-list failures do not silently present the user as signed out.
- Refreshing the browser, returning from required login, or recovering from a failed save restores the latest locally persisted draft for the correct account.
- Local persistence is debounced with an initial target of at most one second after typing stops; failed persistence is visible rather than reported as saved.
- Actual sign-out, account switching, and revoked write permissions remain enforced. The user's recoverable writing survives without granting unauthorized backend access.

### Priority 1: reduce unnecessary API work

- [ ] Capture a baseline for signed-out, viewer, writer, and admin visits: initial request counts, duplicate requests, payload sizes, and request durations. Separate cold function starts, Supabase calls, and image downloads; check the configured Vercel/Supabase regions before considering placement changes.
- [ ] Add structured API error codes/statuses and safe diagnostics. Distinguish invalid application keys/configuration from expired user tokens, forbidden access, and temporary outages.
- [ ] Coordinate refresh through a single shared operation when a token is genuinely expired. Limit recovery attempts; do not refresh/retry invalid-key errors or permission denials. Do not automatically replay non-idempotent writes without a duplicate-prevention design.
- [ ] Deduplicate concurrent profile/post reads and use stable user IDs/roles as dependencies where appropriate. Provide explicit invalidation after profile, role, or post changes.
- [ ] Keep public list reads independent of optional session verification where their result is always public. Preserve authorization and RLS for drafts, writes, and private images; never fall back to anonymous access to bypass a permission error.
- [ ] Add bounded pagination and server-side category filtering with stable ordering. Return list-specific fields; compute or store reading-time data rather than downloading whole bodies only to count words on cards.
- [ ] Deduplicate image/avatar reads by storage key. Evaluate expiring signed-URL caching/batching, lazy loading, and shared downloads; keep private assets scoped to the account and avoid a global/shared cache of draft URLs.
- [ ] Test bounded parallel uploads with useful progress and failure handling if measurements justify it.
- [ ] Add request cancellation/timeouts where useful and bounded retry/backoff for safe reads. Surface failures without clearing the editor.

Acceptance: compare the same representative dataset and routes before/after. Normal production session initialization has one logical profile load; repeated image uses share resolution work; list payloads are bounded; private content is never served from another user's cache. Choose latency targets from the measured baseline instead of claiming an unmeasured improvement.

## Suggested implementation order

1. Reproduce and capture the draft-loss/session lifecycle baseline.
2. Fix editor unmounting, dirty-state overwrites, and transient-error handling; add local draft recovery.
3. Add controlled server autosave and safe reauthentication recovery.
4. Implement dynamic tab titles as a small independent change.
5. Optimize the measured API/image bottlenecks and verify permissions still hold.

## Validation to add during implementation

- Focused tests for event-specific auth handling, duplicate initialization, transient errors, and genuine sign-out.
- Editor tests covering token refresh, user-object refresh, account switches, stale fetch/save responses, offline edits, reload recovery, and OAuth return.
- Browser checks for navigation titles, long writing sessions, multiple tabs, and multiple images.
- API permission tests for public content versus drafts and writes; retry tests that prevent duplicate posts.
- Before/after production-like network traces, followed by build, lint, and the relevant tests.

## References

- Local source: [auth provider](src/auth/AuthContext.tsx), [route guard](src/components/RequireRole.tsx), [editor](src/pages/PostEditorPage.tsx), [API client](src/services/apiClient.ts), [server handler](server/apiHandler.ts), [image service](src/services/imageStorage.ts).
- Supabase: [auth event handling](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) and [session retrieval](https://supabase.com/docs/reference/javascript/auth-getsession). Use event-specific handling and verify SDK behavior against the installed version during implementation.
