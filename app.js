const scenarios = {
  audit: {
    title: "Zone posture audit",
    code: [
      ["comment", "// User: “Check example.com's DNS and security posture.”"],
      ["normal", "const zone = await cf.zones.find({ name: "],
      ["string", '"example.com"'],
      ["normal", " });"],
      ["normal", "const [dns, security] = await Promise.all(["],
      ["normal", "  cf.dns.records.list({ zone_id: zone.id }),"],
      ["normal", "  cf.zones.settings.list({ zone_id: zone.id })"],
      ["normal", "]);"],
      ["normal", "return summarizePosture({ zone, dns, security });"]
    ],
    steps: [
      ["cf.zones.find", "Found zone example.com · active"],
      ["cf.dns.records.list", "Read 3 DNS records"],
      ["cf.zones.settings.list", "Read 2 security settings"],
      ["summarizePosture", "Combined results into an audit summary"]
    ],
    result: {
      status: "success",
      zone: "example.com",
      dns_records: 3,
      security: { ssl_mode: "full_strict", always_use_https: true },
      findings: ["HTTPS redirect is enabled", "SSL is set to Full (strict)", "One DNS record uses a proxied Cloudflare edge"],
      next_step: "Review the DNS inventory and confirm settings meet your policy."
    }
  },
  traffic: {
    title: "Traffic spike investigation",
    code: [
      ["comment", "// User: “Why did traffic to shop.example.com spike?”"],
      ["normal", "const zone = await cf.zones.find({ name: "],
      ["string", '"example.com"'],
      ["normal", " });"],
      ["normal", "const [http, events] = await Promise.all(["],
      ["normal", "  cf.analytics.httpRequests({ zone_id: zone.id, period: "],
      ["string", '"24h"'],
      ["normal", " }),"],
      ["normal", "  cf.security.events.list({ zone_id: zone.id, limit: 100 })"],
      ["normal", "]);"],
      ["normal", "return investigateTraffic({ http, events, host: "],
      ["string", '"shop.example.com"'],
      ["normal", " });"]
    ],
    steps: [
      ["cf.zones.find", "Resolved zone example.com"],
      ["cf.analytics.httpRequests", "Read 24h request summary"],
      ["cf.security.events.list", "Read 100 recent security events"],
      ["investigateTraffic", "Correlated request volume and event sample"]
    ],
    result: {
      status: "success",
      host: "shop.example.com",
      period: "24h",
      requests: { total: 184200, change_vs_previous: "+38%" },
      top_path: "/products/summer-kit",
      security_events_reviewed: 100,
      assessment: "Traffic increased around a popular product path. The sampled events show no matching block spike.",
      next_step: "Compare origin logs and campaign timing before changing security rules."
    }
  },
  threat: {
    title: "Threat response proposal",
    code: [
      ["comment", "// User: “Investigate repeated login attacks and suggest a response.”"],
      ["normal", "const zone = await cf.zones.find({ name: "],
      ["string", '"example.com"'],
      ["normal", " });"],
      ["normal", "const events = await cf.security.events.list({"],
      ["normal", "  zone_id: zone.id, action: "],
      ["string", '"managed_challenge"'],
      ["normal", ", limit: 100"],
      ["normal", "});"],
      ["normal", "const summary = groupBySource(events, "],
      ["string", '"client_ip"'],
      ["normal", ");"],
      ["normal", "return proposeRule(summary); // review; do not apply"]
    ],
    steps: [
      ["cf.zones.find", "Resolved zone example.com"],
      ["cf.security.events.list", "Read 100 challenge events"],
      ["groupBySource", "Grouped repeated login-path requests by source"],
      ["proposeRule", "Prepared a review-only recommendation (no write call)"]
    ],
    result: {
      status: "success",
      signal: "Repeated POST requests to /login",
      top_source_sample: "203.0.113.42 (fictional documentation IP)",
      matching_events: 37,
      recommendation: "Consider a rate-limit or managed challenge for repeated /login requests. Tune thresholds using real traffic.",
      action_taken: "None — this demo only proposes a response.",
      next_step: "Verify with your security team, then apply a least-privilege, reviewed change."
    }
  }
};

const scenarioButtons = [...document.querySelectorAll(".scenario-card")];
const codeElement = document.querySelector("#code-example");
const traceElement = document.querySelector("#trace");
const outputElement = document.querySelector("#output-json");
const runButton = document.querySelector("#run-button");
const runStatus = document.querySelector("#run-status");
const resultState = document.querySelector("#result-state");
const resultTitle = document.querySelector("#result-title");
let selectedScenario = "audit";
let activeRun = 0;

function renderCode(lines) {
  codeElement.replaceChildren();
  lines.forEach(([type, text], index) => {
    const line = document.createElement("span");
    line.className = `code-line ${type === "comment" ? "syntax-comment" : ""}`;
    const number = document.createElement("span");
    number.className = "ln";
    number.textContent = String(index + 1).padStart(2, "0");
    line.append(number);
    if (type === "comment") {
      line.append(document.createTextNode(text));
    } else {
      const fragments = text.split(/(cf\.[\w.]+|Promise|await|const|return|async|summarizePosture|investigateTraffic|groupBySource|proposeRule|"(?:[^"]*)")/g);
      fragments.forEach((fragment) => {
        const span = document.createElement("span");
        if (fragment.startsWith('"')) span.className = "syntax-string";
        else if (/^(await|const|return|async)$/.test(fragment)) span.className = "syntax-keyword";
        else if (fragment.startsWith("cf.")) span.className = "syntax-api";
        else if (/^(Promise|summarizePosture|investigateTraffic|groupBySource|proposeRule)$/.test(fragment)) span.className = "syntax-function";
        span.textContent = fragment;
        line.append(span);
      });
    }
    codeElement.append(line);
    if (index < lines.length - 1) codeElement.append(document.createTextNode("\n"));
  });
}

function selectScenario(name) {
  activeRun += 1;
  runButton.disabled = false;
  selectedScenario = name;
  const scenario = scenarios[name];
  scenarioButtons.forEach((button) => {
    const isSelected = button.dataset.scenario === name;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
  renderCode(scenario.code);
  resultTitle.textContent = "Your output";
  resultState.textContent = "WAITING";
  resultState.classList.remove("is-success");
  traceElement.innerHTML = '<div class="empty-state"><span class="empty-symbol">↳</span><b>Nothing has run yet</b><span>Start the workflow to see each mocked API call and its result.</span></div>';
  outputElement.textContent = JSON.stringify({ status: "waiting", hint: "Choose a scenario and run it" }, null, 2);
  runStatus.className = "run-status";
  runStatus.textContent = "Ready to run · no Cloudflare account required";
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function appendTraceStep([name, detail], index) {
  const step = document.createElement("div");
  step.className = "trace-step";
  const check = document.createElement("span");
  check.className = "trace-check";
  check.textContent = "✓";
  const label = document.createElement("span");
  label.className = "trace-name";
  label.textContent = name;
  const time = document.createElement("span");
  time.className = "trace-time";
  time.textContent = `${42 + index * 31}ms`;
  const description = document.createElement("span");
  description.className = "trace-detail";
  description.textContent = detail;
  step.append(check, label, time, description);
  traceElement.append(step);
}

async function runWorkflow() {
  const runId = ++activeRun;
  const scenario = scenarios[selectedScenario];
  traceElement.replaceChildren();
  outputElement.textContent = "// Running local mock workflow…";
  resultState.textContent = "RUNNING";
  resultState.classList.remove("is-success");
  runStatus.className = "run-status is-running";
  runStatus.textContent = "Executing example workflow against local mock data…";
  runButton.disabled = true;

  for (const [index, step] of scenario.steps.entries()) {
    await delay(300);
    if (runId !== activeRun) return;
    appendTraceStep(step, index);
  }

  if (runId !== activeRun) return;
  outputElement.textContent = JSON.stringify(scenario.result, null, 2);
  resultTitle.textContent = scenario.title;
  resultState.textContent = "COMPLETE";
  resultState.classList.add("is-success");
  runStatus.className = "run-status is-done";
  runStatus.textContent = `Completed ${scenario.steps.length} illustrative steps · no network requests made`;
  runButton.disabled = false;
}

scenarioButtons.forEach((button) => button.addEventListener("click", () => selectScenario(button.dataset.scenario)));
runButton.addEventListener("click", runWorkflow);
renderCode(scenarios[selectedScenario].code);
