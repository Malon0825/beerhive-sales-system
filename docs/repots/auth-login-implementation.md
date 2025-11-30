# BeerHive POS – Authentication & Login Implementation

## 1. Overview

- **Stack**
  - Next.js App Router
  - Supabase for authentication (email/password) and sessions
  - Custom `AuthService`, `SessionService`, and React context (`AuthContext`) on the client
  - Route protection via Next.js `middleware.ts`
  - Role-based access control via `roleBasedAccess.ts`
  - Server-side utilities for API auth in `api-auth.ts`

- **High-level flow**
  - User opens `/login` and submits username/password.
  - Client calls `/api/auth/login`.
  - API route authenticates against Supabase Auth + `users` table and sets HTTP-only cookies.
  - Client stores Supabase session (optional optimization) and `AuthContext` holds the current user.
  - Middleware uses cookies to gate routes and enforce role-based access.
  - `SessionService` keeps sessions alive and tracks activity; auto-logout is disabled for in-house usage.

---

## 2. Core Components

### 2.1 Client Supabase client (`src/data/supabase/client.ts`)

- Lazily creates a **browser-side Supabase client** using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Uses localStorage with key `beerhive-auth-token` to persist sessions.
- Config:
  - `persistSession: true`
  - `autoRefreshToken: true`
  - `detectSessionInUrl: false`
- Exported as a Proxy `supabase` so it is only instantiated at runtime when first used.

### 2.2 Server Supabase admin client (`src/data/supabase/server-client.ts`)

- Lazily creates a **server-side admin client** using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Used where the app needs:
  - To bypass RLS for internal lookups (e.g. `users` table on login).
  - To validate tokens and load user records.
- Also exported as a Proxy `supabaseAdmin`, never exposed to the browser.

### 2.3 Auth service (`src/core/services/auth/AuthService.ts`)

- Central client-side abstraction around auth.
- Main responsibilities:
  - **Login** with retry and timeout.
  - **Logout** via Supabase.
  - **Get current user** by validating Supabase session against an API endpoint.
  - Helpers for **role checks** and **manager PIN verification**.

#### 2.3.1 `AuthUser` model

- Represents the currently logged-in user:
  - `id`, `username`, `email`, `full_name`
  - `role: UserRole` (deprecated, kept for backward compatibility)
  - `roles: UserRole[]` (primary source of truth for access control)
  - `is_active: boolean`
- All new code should use the `roles` array; `role` is just the primary role.

#### 2.3.2 `login(credentials)`

- Calls **`/api/auth/login`** via `fetch`:
  - POST JSON payload `{ username, password }`.
  - 15-second timeout using `AbortSignal.timeout(15000)`.
- Wraps the operation in `retryWithBackoff`:
  - Up to 3 retries.
  - Exponential backoff (1s, 2s, 4s, capped at 5s).
  - Does **not** retry for 4xx (`AppError` with 4xx status) – avoids replaying bad credentials.
- On successful response:
  - Expects `{ success: true, data: { user, session } }`.
  - If `session` present, attempts `supabase.auth.setSession({ access_token, refresh_token })`.
    - Failures are **logged but not fatal** (server cookies are the canonical auth state).
- Returns the `user` object (`AuthUser`) to the caller.
- Error behaviour:
  - Wraps network errors, timeouts, and unexpected errors into `AppError` with friendly messages.

#### 2.3.3 `getCurrentUser()`

- Uses Supabase client to fetch current session:
  - `const { data: { session } } = await supabase.auth.getSession()`.
  - Returns `null` if no session.
- If a session exists, validates it via server-side endpoint **`/api/auth/session`**:
  - Sends `Authorization: Bearer <access_token>` header.
  - 10-second timeout.
  - If API returns non-OK:
    - On `401/403` → treated as unauthenticated, returns `null`.
    - On 5xx → throws to trigger retry.
- Uses `retryWithBackoff` (only 2 retries here) to handle transient server issues quickly.
- Returns `AuthUser | null`.

#### 2.3.4 Logout and role helpers

- `logout()`:
  - Calls `supabase.auth.signOut()` client-side.
- Role helpers:
  - `hasRole(user, allowedRoles)` → `true` if any role matches.
  - `isAdmin(user)` → checks for `UserRole.ADMIN` in roles.
  - `isManagerOrAbove(user)` → checks for `ADMIN` or `MANAGER`.
- `verifyManagerPIN(pin)` (currently simplified):
  - Fetches current user.
  - Returns `true` if user is manager/admin, otherwise `false`.
  - PIN itself is not yet validated against a stored hash (placeholder for future hardening).

### 2.4 Session service (`src/core/services/auth/SessionService.ts`)

- Manages **client-side session lifecycle** and activity tracking.
- Constants:
  - `SESSION_KEY = 'beerhive_session'`.
  - `SESSION_TIMEOUT_MINUTES = 1440` (24 hours).
  - `AUTO_LOGOUT_ENABLED = false` (in-house system, staff stay logged in for full shifts).

#### 2.4.1 Initialization

- `initialize()` should be called once on app startup (done in `AuthContext`):
  - Subscribes to `supabase.auth.onAuthStateChange`:
    - `SIGNED_OUT` → clears stored session metadata.
    - `SIGNED_IN` / `TOKEN_REFRESHED` → logs and updates last activity.
  - Starts **inactivity tracking** (`startInactivityTimer`).
  - Starts **automatic token refresh** (`startTokenRefresh`).

#### 2.4.2 Automatic token refresh

- `startTokenRefresh()`:
  - Every 50 minutes, checks if there is a session.
  - If session exists, calls `refreshSession()`.
  - Logs success/failure, but failure only warns – doesn’t immediately log out.

#### 2.4.3 Inactivity handling

- Because `AUTO_LOGOUT_ENABLED = false`:
  - The service only **tracks activity** without auto-logout.
  - Listens to `mousedown`, `keydown`, `scroll`, `touchstart` and updates a `last_activity` timestamp in `localStorage`.
  - Logic to actually auto-logout exists in `handleInactiveLogout`, but is only used if the flag is turned on.

#### 2.4.4 Utility methods

- `clearSession()` – removes session-related entries from `localStorage`.
- `isSessionValid()` – wrapper around `supabase.auth.getSession()` → boolean.
- `refreshSession()` – calls `supabase.auth.refreshSession()`.
- `getSession()` – returns the Supabase session object or `null`.

### 2.5 Auth context and hook

#### 2.5.1 `AuthContext` (`src/lib/contexts/AuthContext.tsx`)

- React context providing authentication state and actions:
  - `user: AuthUser | null`
  - `loading: boolean`
  - `login(username, password)`
  - `logout()`
  - `refreshUser()`
  - `isAuthenticated: boolean`
- Key behaviours:
  - On mount:
    - Calls `SessionService.initialize()`.
    - Calls `loadUser()`:
      - Retrieves current user via `AuthService.getCurrentUser()`.
      - Sets `user` and `loading` accordingly.
  - `login()`:
    - Calls `AuthService.login({ username, password })`.
    - Immediately updates local `user` state.
    - Waits 100ms to let cookies settle.
    - Performs **hard navigation** `window.location.href = '/'`.
      - Ensures the first request after login is made with fresh cookies.
      - Root page then performs role-based routing.
  - `logout()`:
    - Calls `/api/auth/logout` (POST) to clear cookies.
    - Calls `AuthService.logout()` (Supabase sign-out on client).
    - Clears `user` state and `SessionService.clearSession()`.
    - Navigates to `/login`.

#### 2.5.2 `useAuth` hook (`src/lib/hooks/useAuth.ts`)

- Thin wrapper over `useAuthContext()` that adds **role-aware helpers**:
  - `hasRole(allowedRoles)`
  - `isAdmin`, `isManager`, `isCashier`, `isKitchen`, `isBartender`, `isWaiter`
  - Aggregated rights: `isManagerOrAbove`, `canAccessPOS`, `canAccessKitchen`, `canAccessBartender`, `canAccessWaiter`, `canManageInventory`, `canViewReports`.
- All checks are based on the `roles` array of the `AuthUser`.

### 2.6 Login UI (`src/views/auth/LoginForm.tsx` and `/login` page)

- `/app/(auth)/login/page.tsx`:
  - Client component.
  - Uses `useAuth()` to access `login`, `isAuthenticated`, `loading`.
  - Shows a loading spinner while `loading` is true.
  - Renders `LoginForm` and passes `login` as `onSubmit`.
- `LoginForm`:
  - Uses `react-hook-form` + `zod` for validation.
  - Fields: `username`, `password` with basic length validation.
  - On submit:
    - Sets loading state.
    - Calls `onSubmit(username, password)` (which is `AuthContext.login`).
    - Catches errors and surfaces `err.message` or a generic message.
  - Provides UX feedback: spinners, inline errors, password visibility toggle.

---

## 3. Server-Side Auth: API Routes & Utilities

### 3.1 Login API (`src/app/api/auth/login/route.ts`)

- Endpoint: `POST /api/auth/login`.
- Responsibilities:
  1. Validate payload (`username`, `password` required).
  2. Look up user in `users` table using `supabaseAdmin` (bypass RLS):
     - Selects `id, username, email, full_name, role, roles, is_active`.
  3. Ensure account is **active** (`is_active === true`).
  4. Verify password against Supabase Auth using an **isolated Supabase client**:
     - Created per-request with `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)`.
     - Calls `auth.signInWithPassword({ email, password })`.
     - Using an isolated client avoids admin session pollution under load.
  5. Update `last_login` for the user.
  6. Normalize role information:
     - If `roles` array exists and not empty, use that.
     - Else, wrap single `role` into `[role]`.
     - Compute `primaryRole` as `userRoles[0]`.
  7. Build JSON response with `user` and `session`.
  8. Set **auth cookies** on the response:
     - `auth-token` = `access_token` from Supabase session.
     - `user-roles` = JSON stringified roles array.
     - `user-id` = user id (for server-side lookups and debugging).

- Cookie config (`cookieOptions`):
  - `httpOnly: true` (not readable from JavaScript).
  - `secure: process.env.NODE_ENV === 'production'`.
  - `sameSite: 'lax'`.
  - `maxAge: 24h`.
  - `path: '/'`.

- Error handling:
  - User not found / wrong credentials → `401` with generic `Invalid username or password` (no user enumeration).
  - Inactive account → `403` with a specific admin-contact message.
  - Misconfiguration (missing env vars) → `AppError('Server configuration error', 500)`.
  - Any `AppError` bubbled up returns structured JSON with appropriate status.

### 3.2 Logout API (`src/app/api/auth/logout/route.ts`)

- Endpoint: `POST /api/auth/logout`.
- Returns `{ success: true, message: 'Logout successful' }` and deletes cookies:
  - `auth-token`
  - `user-roles`
  - `user-role` (legacy cookie)
- Errors are logged and reported as `500` with a generic message.

### 3.3 API auth utilities (`src/lib/utils/api-auth.ts`)

- Provide reusable helpers for **API routes** to enforce auth/roles.

#### 3.3.1 `getAuthenticatedUser(request)`

- Supports two mechanisms:
  1. **Cookie-based** (primary for web UI):
     - `user-id` cookie is read first.
     - If absent, tries to validate `auth-token` via `supabaseAdmin.auth.getUser(token)`.
  2. **Authorization header** (Bearer token) for external clients:
     - Parses `Authorization: Bearer <token>`.
     - Validates via `supabaseAdmin.auth.getUser(token)`.
- If no user id can be determined, returns `null`.
- Once `userId` is known:
  - Loads user record from `users` table (`id, username, email, full_name, role, is_active`).
  - If user not found or lookup fails → logs and returns `null`.
  - If `is_active` is false → throws `AppError('User account is inactive', 403)`.

#### 3.3.2 `requireAuth(request)`

- Wraps `getAuthenticatedUser`.
- Throws `AppError('Authentication required', 401)` if user is not authenticated.

#### 3.3.3 Role-based API guards

- `requireRole(request, allowedRoles)` – ensures `user.role` is in `allowedRoles`.
- `requireManagerOrAbove(request)` – allows `ADMIN` or `MANAGER`.
- `requireAdmin(request)` – `ADMIN` only.

These helpers standardize how API routes enforce both auth and authorization.

---

## 4. Route Protection & Role-Based Access

### 4.1 Middleware (`src/middleware.ts`)

- Runs on **every request** except for excluded assets.

#### 4.1.1 Public and API routes

- `publicRoutes`: `['/login', '/api/auth/login']` – no auth required.
- `apiRoutes`: `['/api']` – middleware bypasses role checks; API routes perform their own checks via `api-auth.ts`.

#### 4.1.2 Authentication check

- Reads `auth-token` from cookies:
  - If missing → redirect to `/login`.
- Reads `user-roles` cookie (JSON array string):
  - If missing or invalid → redirect to `/login`.
  - Tries to `JSON.parse`; failures logged and treated as unauthenticated.

#### 4.1.3 Authorization check

- Uses `ROUTE_ACCESS_RULES` from `roleBasedAccess.ts`.
- Finds the first matching rule where:
  - `pathname === rule.path` or `pathname.startsWith(rule.path + '/')`.
- If a rule is found:
  - Checks whether **any** of the user’s roles (from cookie) appears in `allowedRoles` (case-insensitive compare).
  - If not allowed:
    - Uses `getDefaultRouteForRole(userRoles)` to calculate the user’s **default page**.
    - Logs a warning and redirects there.
- If no rule is found:
  - Access is allowed by default (backward compatibility).

### 4.2 Role mapping (`src/lib/utils/roleBasedAccess.ts`)

- Central configuration of which roles can access which top-level routes.
- Examples:
  - `/pos` → `ADMIN`, `MANAGER`, `CASHIER`.
  - `/kitchen` → `ADMIN`, `MANAGER`, `KITCHEN`.
  - `/bartender` → `ADMIN`, `MANAGER`, `BARTENDER`.
  - `/waiter` → `ADMIN`, `MANAGER`, `WAITER`.
  - `/reports`, `/inventory`, `/packages`, `/events`, `/happy-hours`, `/settings` → `ADMIN`, `MANAGER`.
  - `/audit-logs` → `ADMIN` only.

#### 4.2.1 `canAccessRoute(route, userRoles)`

- Used in client logic to decide if certain UI sections should be visible.
- Accepts a single role or array of roles.
- Returns `true` if any user role is in the route’s `allowedRoles`.

#### 4.2.2 `getDefaultRouteForRole(roles)`

- Determines the landing page after login, or where to send users when they try to access unauthorized routes.
- Priority:
  1. If roles include `ADMIN` → `/reports`.
  2. Else if roles include `MANAGER` → `/reports`.
  3. Else uses **first role in array** (primary role) and maps:
     - `CASHIER` → `/pos`
     - `KITCHEN` → `/kitchen`
     - `BARTENDER` → `/bartender`
     - `WAITER` → `/waiter`
     - Default → `/`.

---

## 5. End-to-End Login Sequence

This summarizes the typical login lifecycle for a bar staff user.

1. **User visits `/login`**
   - Renders `LoginPage` → `LoginForm`.
   - `AuthContext` is already mounted (via root layout) and has called `SessionService.initialize()` and attempted `getCurrentUser()`.
2. **User submits credentials**
   - `LoginForm` validates input with `zod`.
   - `onSubmit(username, password)` calls `AuthContext.login`.
3. **Client-side login**
   - `AuthContext.login` calls `AuthService.login({ username, password })`.
   - On success, `AuthContext` updates `user` in state and waits briefly.
4. **Server-side login**
   - `/api/auth/login` validates credentials against Supabase Auth + `users` table.
   - On success, issues `auth-token`, `user-roles`, `user-id` cookies and returns `user` + `session`.
5. **Client session setup**
   - `AuthService.login` attempts `supabase.auth.setSession()` with returned session (optional optimization).
6. **Redirect**
   - `AuthContext.login` performs `window.location.href = '/'`.
   - Next request hits middleware, which sees the new cookies and authorizes the user.
7. **Post-login routing**
   - Root page or subsequent navigation uses `getDefaultRouteForRole` or `useAuth` helpers to send user to the correct feature area (e.g. `/pos`, `/kitchen`, etc.).

Logout sequence:

1. User triggers logout (e.g. via UI button that calls `useAuth().logout`).
2. `AuthContext.logout`:
   - Calls `/api/auth/logout` to clear cookies.
   - Calls `AuthService.logout()` to sign out from Supabase on client.
   - Clears `user` state and local session via `SessionService.clearSession()`.
   - Redirects to `/login`.

---

## 6. Security & Operational Considerations

### 6.1 Implemented protections

- **Server-only verification of credentials**:
  - Username/password are only verified in `/api/auth/login` using Supabase Auth and the admin client.
  - Client never holds service keys.
- **HTTP-only cookies** for `auth-token`, `user-roles`, `user-id`:
  - Cannot be read/modified from client JS.
  - Used by middleware and server-side API utilities for auth.
- **Isolated login client** in `/api/auth/login`:
  - Per-request Supabase client to avoid shared-session side effects under concurrency.
- **Account status flag** (`is_active`):
  - Inactive users are blocked from logging in and API access.
- **Multi-role support**:
  - Role array used across middleware, client helpers, and API utilities.
  - Prevents brittle single-role assumptions.
- **Error handling**:
  - Generic error messages for invalid credentials (no user enumeration).
  - `AppError` used to propagate HTTP status codes cleanly.
- **Session longevity** tuned for bar operations:
  - 24-hour cookies and tokens.
  - Auto-logout disabled, token refresh enabled.

### 6.2 Potential follow-ups / gaps

These are not bugs but areas you might want to document or enhance further:

- **CSRF**: Cookies are HTTP-only with `sameSite: 'lax'`, which offers some protection, but CSRF tokens or stricter patterns could be added for sensitive POST endpoints outside auth.
- **Manager PIN**: Currently just checks role; adding a hashed PIN field per manager and verifying it would harden approvals.
- **Session revocation**: Currently relies on Supabase and cookie expiry; explicit revocation flows (e.g. force logout from admin panel) could be added.
- **Audit/logging**: Login attempts are logged on the server; if needed, these logs could be persisted into an `audit_logs` table.

---

## 7. Summary

- Authentication is built on **Supabase Auth** with a custom Next.js/React integration.
- **Login** is performed via `/api/auth/login`, which sets HTTP-only cookies and returns a typed `AuthUser` + session.
- **Client state** is managed via `AuthContext`, `AuthService`, `SessionService`, and the `useAuth` hook.
- **Route protection** is enforced centrally in `middleware.ts` plus `roleBasedAccess.ts`.
- **API routes** use `api-auth.ts` helpers for consistent authentication and role checks.

This design keeps credentials and privileged operations on the server while providing a convenient, role-aware API for the UI and feature modules.
