const DEFAULT_POLICY = {
    whitelist: ["**"],
    blacklist: [".git/**", "deps/**", "_build/**", "node_modules/**", ".env", "**/.env"],
    syntax: ["ex", "exs", "js", "json", "html", "css", "md", "txt"],
    output: { reference: true, metadata: true, full: false }
};

const STORAGE_KEY = "reverse-agent-desk-policy";
function loadPolicy() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return {
            ...DEFAULT_POLICY,
            ...saved,
            whitelist: saved?.whitelist ?? DEFAULT_POLICY.whitelist,
            blacklist: saved?.blacklist ?? DEFAULT_POLICY.blacklist,
            syntax: saved?.syntax ?? DEFAULT_POLICY.syntax,
            output: { ...DEFAULT_POLICY.output, ...saved?.output }
        };
    } catch { return structuredClone(DEFAULT_POLICY); }
}

const deskPolicy = loadPolicy();
let projectFiles = [];
const byId = id => document.getElementById(id);

export function openDeskFilter() { byId("deskFilterOverlay")?.classList.remove("hidden"); }
function closeDeskFilter() { byId("deskFilterOverlay")?.classList.add("hidden"); }
byId("closeDeskFilter")?.addEventListener("click", closeDeskFilter);

document.querySelectorAll(".filter-nav").forEach(button => button.addEventListener("click", () => {
    document.querySelectorAll(".filter-nav").forEach(item => item.classList.remove("active"));
    document.querySelectorAll(".filter-page").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    byId(`page-${button.dataset.tab}`)?.classList.add("active");
    if (button.dataset.tab === "preview") renderPreview();
}));

function renderRules(type, containerId) {
    const container = byId(containerId);
    if (!container) return;
    container.replaceChildren();
    deskPolicy[type].forEach((rule, index) => {
        const item = document.createElement("div"); item.className = "rule-item";
        const name = document.createElement("code"); name.textContent = rule;
        const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "移除";
        remove.addEventListener("click", () => { deskPolicy[type].splice(index, 1); renderRules(type, containerId); markDirty(); });
        item.append(name, remove); container.appendChild(item);
    });
}

function addRule(type, inputId, containerId) {
    const input = byId(inputId); const value = input?.value.trim().replace(/^\/+/, "");
    if (!value || deskPolicy[type].includes(value)) return;
    deskPolicy[type].push(value); input.value = "";
    renderRules(type, containerId); markDirty();
}

byId("addWhitelist")?.addEventListener("click", () => addRule("whitelist", "whitelistInput", "whitelistRules"));
byId("addBlacklist")?.addEventListener("click", () => addRule("blacklist", "blacklistInput", "blacklistRules"));
byId("whitelistInput")?.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); addRule("whitelist", "whitelistInput", "whitelistRules"); } });
byId("blacklistInput")?.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); addRule("blacklist", "blacklistInput", "blacklistRules"); } });
byId("addSyntax")?.addEventListener("click", () => {
    const input = byId("syntaxInput"); const value = input.value.trim().replace(/^\*?\./, "").toLowerCase();
    if (!value || !/^[a-z0-9_-]+$/.test(value) || deskPolicy.syntax.includes(value)) return;
    deskPolicy.syntax.push(value); input.value = ""; renderSyntax(); markDirty();
});

function renderSyntax() {
    const container = byId("syntaxRules"); if (!container) return;
    container.replaceChildren();
    deskPolicy.syntax.forEach((syntax, index) => {
        const item = document.createElement("div"); item.className = "rule-item";
        const name = document.createElement("code"); name.textContent = `.${syntax}`;
        const remove = document.createElement("button"); remove.type = "button"; remove.textContent = "移除";
        remove.addEventListener("click", () => { deskPolicy.syntax.splice(index, 1); renderSyntax(); markDirty(); });
        item.append(name, remove); container.appendChild(item);
    });
}

[["outputReference", "reference"], ["outputMetadata", "metadata"], ["outputFull", "full"]].forEach(([id, key]) => {
    const input = byId(id); if (!input) return;
    input.checked = deskPolicy.output[key];
    input.addEventListener("change", event => { deskPolicy.output[key] = event.target.checked; markDirty(); });
});

function normalizePath(path) { return String(path).replace(/\\/g, "/").replace(/^\/+/, ""); }
function globMatches(path, pattern) {
    const normalized = normalizePath(pattern);
    const escaped = normalized.replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "§§DOUBLE§§").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]").replace(/§§DOUBLE§§/g, ".*");
    try {
        const matcher = new RegExp(`^${escaped}$`, "i");
        const candidates = [path];
        // A filename-only rule such as *.docx applies at every folder depth.
        if (!normalized.includes("/")) candidates.push(path.split("/").pop());
        return candidates.some(candidate => matcher.test(candidate));
    } catch { return false; }
}
function matchesRule(path, rule) {
    path = normalizePath(path); rule = normalizePath(rule);
    if (rule.includes("*") || rule.includes("?")) return globMatches(path, rule);
    return path === rule || path.endsWith(`/${rule}`) || path.startsWith(rule.endsWith("/") ? rule : `${rule}/`);
}

export function checkDeskPolicy(path) {
    const normalized = normalizePath(path);
    const extension = normalized.split("/").pop().split(".").pop().toLowerCase();
    if (!deskPolicy.syntax.includes(extension)) return false;
    if (deskPolicy.blacklist.some(rule => matchesRule(normalized, rule))) return false;
    return deskPolicy.whitelist.length === 0 || deskPolicy.whitelist.some(rule => matchesRule(normalized, rule));
}

export function getDeskPolicy() { return structuredClone(deskPolicy); }
export function setProjectFiles(files) { projectFiles = files; renderPreview(); }
export function getAllowedProjectFiles() { return projectFiles.filter(file => checkDeskPolicy(file.path)); }

function renderPreview() {
    const container = byId("policyPreview"); if (!container) return;
    container.replaceChildren();
    if (!projectFiles.length) { container.textContent = "尚未載入專案檔案。"; return; }
    projectFiles.forEach(file => {
        const path = typeof file === "string" ? file : file.path;
        const item = document.createElement("div"); item.className = "preview-item";
        const name = document.createElement("span"); name.textContent = path;
        const status = document.createElement("span"); status.textContent = checkDeskPolicy(path) ? "可手動加入" : "篩選排除";
        status.className = checkDeskPolicy(path) ? "preview-allowed" : "preview-denied";
        item.append(name, status); container.appendChild(item);
    });
}

function markDirty() { byId("filterStatus").textContent = "政策有未儲存變更"; renderPreview(); }
byId("saveDeskFilter")?.addEventListener("click", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(deskPolicy));
    byId("filterStatus").textContent = "篩選規則已儲存";
    closeDeskFilter();
    document.dispatchEvent(new CustomEvent("desk-policy-changed"));
});

renderRules("whitelist", "whitelistRules");
renderRules("blacklist", "blacklistRules");
renderSyntax();
