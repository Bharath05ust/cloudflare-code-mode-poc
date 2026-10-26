# Code Mode Lab — Cloudflare POC

A local-first, browser-only demonstration of the Code Mode pattern for working with Cloudflare APIs through an AI tool interface. It explains what the pattern does and lets you step through three realistic, **simulated** workflows.

## Run it

Open `index.html` in a modern browser. No build, package installation, Cloudflare account, API token, or server is required. If your browser restricts local files, run a static server from this folder, for example:

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Try the demo

Choose a workflow in the playground, inspect its illustrative TypeScript, then select **Run workflow**:

- **Audit a zone** — combine a zone lookup with DNS and security-settings reads.
- **Investigate traffic** — correlate a request summary with a sample of security events.
- **Respond to a threat** — group security events and return a review-only recommendation; no write action is performed.

The execution trace and JSON output are deterministic sample data bundled in `app.js`. The app makes no Cloudflare API calls and sends no credentials or data over the network. Google Fonts are loaded from Google Fonts when an internet connection is available; the system font stack remains as a fallback.

## What this demonstrates

Code Mode is a pattern for exposing a large API surface to an AI through a small interface: the model discovers relevant methods, writes code to compose them, and asks a controlled runtime to execute that code. This can reduce tool-definition/context overhead and let code handle intermediate results, batching, and branching. It does not remove the need for a compatible MCP server, authorization, permission boundaries, validation, logging, or human approval for risky operations. Savings and exact interfaces vary by implementation.

The code displayed in the playground is explanatory—not executed. The browser runs fixed scenario data and trace steps so this POC is safe to present without Cloudflare credentials. Connecting a real account requires a compatible Code Mode/MCP runtime, server-side secrets, and an explicit security review; do not put API tokens in browser code.
