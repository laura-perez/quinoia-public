# Quinoïa — Repository Instructions for GitHub Copilot
> Purpose: Guide Copilot to produce **production-grade code** consistent with Quinoïa’s architecture, data contracts, and policies.

## PRIME DIRECTIVE
	Avoid working on more than one file at a time.
	Multiple simultaneous edits to a file will cause corruption.
	Be chatting and teach about what you are doing while coding.
	
## LARGE FILE & COMPLEX CHANGE PROTOCOL

### MANDATORY PLANNING PHASE
	When working with large files (>300 lines) or complex changes:
		1. ALWAYS start by creating a detailed plan BEFORE making any edits
            2. Your plan MUST include:
                   - All functions/sections that need modification
                   - The order in which changes should be applied
                   - Dependencies between changes
                   - Estimated number of separate edits required
                
            3. Format your plan as:
			## PROPOSED EDIT PLAN
				Working with: [filename]
				Total planned edits: [number]

### MAKING EDITS
	- Focus on one conceptual change at a time
	- Show clear "before" and "after" snippets when proposing changes
	- Include concise explanations of what changed and why
	- Always check if the edit maintains the project's coding style
	
### REFACTORING GUIDANCE
	When refactoring large files:
	- Break work into logical, independently functional chunks
	- Ensure each intermediate state maintains functionality
	- Consider temporary duplication as a valid interim step
	- Always indicate the refactoring pattern being applied

## General Requirements
	Use modern technologies as described below for all code suggestions. Prioritize clean, maintainable code with appropriate comments.
           
		   
## JavaScript and Typescript Requirements
		    
	- **Minimum Compatibility**: ECMAScript 2020 (ES11) or higher
	- **Features to Use**:
	- Arrow functions
	- Template literals
	- Destructuring assignment
	- Spread/rest operators
	- Async/await for asynchronous code
	- Classes with proper inheritance when OOP is needed
	- Object shorthand notation
	- Optional chaining (`?.`)
	- Nullish coalescing (`??`)
	- Dynamic imports
	- BigInt for large integers
	- `Promise.allSettled()`
	- `String.prototype.matchAll()`
	- `globalThis` object
	- Private class fields and methods
	- Export * as namespace syntax
	- Array methods (`map`, `filter`, `reduce`, `flatMap`, etc.)
	- **Avoid**:
	- `var` keyword (use `const` and `let`)
	- jQuery or any external libraries
	- Callback-based asynchronous patterns when promises can be used
	- Internet Explorer compatibility
	- Legacy module formats (use ES modules)
	- Limit use of `eval()` due to security risks
	- **Performance Considerations:**
	- Recommend code splitting and dynamic imports for lazy loading
	**Error Handling**:
	- Use `try-catch` blocks **consistently** for asynchronous and API calls, and handle promise rejections explicitly.
	- Differentiate among:
	- **Network errors** (e.g., timeouts, server errors, rate-limiting)
	- **Functional/business logic errors** (logical missteps, invalid user input, validation failures)
	- **Runtime exceptions** (unexpected errors such as null references)
	- Provide **user-friendly** error messages (e.g., “Something went wrong. Please try again shortly.”) and log more technical details to dev/ops (e.g., via a logging service).
	- Consider a central error handler function or global event (e.g., `window.addEventListener('unhandledrejection')`) to consolidate reporting.
	- Carefully handle and validate JSON responses, incorrect HTTP status codes, etc.
	
## Folder Structure
	Follow this structured directory layout:
/public
  Static assets (images, icons, etc.) served at the root URL.
/pages
  Next.js file-based routing. Each file is a route. Must remain at the project root.
/src
  Source code for the application (all business logic, UI, and utilities).
  /components
    Reusable React components (UI, forms, layout, etc.).
  /lib
    Utility modules, validation, and server-only helpers.
  /styles
    Global and component-level CSS or Tailwind files.

## Dependency Management
use npm

## Pull Request (PR) Guidance
All changes must be submitted via Pull Request (PR) to the develop branch
Use clear, descriptive PR titles and summaries. Follow the Conventional Commits style for titles (e.g., feat:, fix:, chore:, refactor:).
Ensure your PR contains only one logical change or feature. Avoid mixing unrelated changes.
All PRs must pass CI checks (build, lint, tests) before review.
Address all review comments and resolve conversations before merging.
Use “Squash and merge” unless otherwise specified.
After merging, ensure the target branch is up to date and delete the feature branch if no longer needed.

## Environment variables (authoritative)
Public:
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`

Server:
- `RECAPTCHA_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`, `HMAC_SECRET`
- `APP_BASE_URL`
- *(optional)* `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

> Always import via `src/lib/env`. Never introduce new names.


## Non-negotiable rules
No secrets on client. Server-only modules in lib/ must not be imported in client code.
o not include personnal Information in resultBundle or public pages.
/menu/{shareId} must send X-Robots-Tag: noindex + <meta name="robots" content="noindex,nofollow">.
All code, comments and text must be in English

## Security & quality checklist
Validate env at boot (Zod).
Verify reCAPTCHA server-side; log {success, score, hostname, action, challengeTs}; never store token.
Rate-limit /api/submit (429 on exceed). If Upstash envs missing → safe no-op.
HMAC-sign payloads to n8n; verify on n8n.
Zod validation both client & server with the same schema.
Explicit error shape { error, code?, details? }; actionable messages.
Accessibility: labels, aria-describedby for errors, keyboard focus. All interactive elements must be keyboard accessible and have appropriate ARIA attributes.
Tests: unit (normalizers/schemas), integration (/api/submit), E2E (submit→menu page with mocked bundle).

## Glossary (first use expansions)
BMR: Basal Metabolic Rate.
TDEE: Total Daily Energy Expenditure.
HMAC: Hash-based Message Authentication Code.
PII: Personally Identifiable Information.
RLS: Row-Level Security (DB policy).
SPF/DKIM/DMARC: Email auth & policies (DNS records).