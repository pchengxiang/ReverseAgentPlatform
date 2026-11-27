import { openFile } from "../editor/editor.js";
import {
    checkDeskPolicy,
    getAllowedProjectFiles,
    getDeskPolicy,
    setProjectFiles
} from "../desk/desk_filter.js";
import { deleteProjectFile } from "./load_project.js";

const fileTree = document.getElementById("fileTree");
const deskView = document.getElementById("deskView");

let projectTree = null;
let deskMode = false;

// 工作桌只記錄使用者以 Shift+左鍵加入的檔案。
// 顯示前仍會重新套用篩選政策，確保黑名單和語法限制有效。
const deskReferences = new Map();
let fileNoticeTimer = null;

/** Show a short, accessible status message beside the file explorer. */
function showFileNotice(message) {
    const notice = document.getElementById("fileNotice");
    if (!notice) return;

    notice.textContent = message;
    notice.classList.remove("hidden");

    window.clearTimeout(fileNoticeTimer);
    fileNoticeTimer = window.setTimeout(() => {
        notice.classList.add("hidden");
    }, 5000);
}

/**
 * 顯示專案檔案樹，並更新篩選器可用的相對路徑清單。
 * 傳入新專案時會清空舊工作桌的檔案參考，避免跨專案殘留。
 */
export function renderFileExplorer(directory = null) {
    if (directory) {
        projectTree = directory;
        deskReferences.clear();
    } else {
        directory = projectTree;
    }

    if (!directory) return;

    const files = [];
    for (const child of directory.children ?? []) {
        collectFiles(child, "", files);
    }

    setProjectFiles(files);
    fileTree.replaceChildren(createDirectoryElement(directory, "", true));

    if (deskMode) renderDesk();
}

/** Recursively collect files, keeping paths relative to the selected project. */
function collectFiles(item, parentPath, files) {
    const path = parentPath ? `${parentPath}/${item.name}` : item.name;

    if (item.type === "file") {
        files.push({ path, item });
        return;
    }

    for (const child of item.children ?? []) {
        collectFiles(child, path, files);
    }
}

/** Switch between the regular explorer and the filtered work desk. */
export function setWorkspaceMode(mode) {
    deskMode = mode === "desk";
    fileTree.classList.toggle("hidden", deskMode);
    deskView.classList.toggle("hidden", !deskMode);

    if (deskMode) renderDesk();
}

/** Add a file to the work desk only when the active policy allows it. */
function addDeskReference(path, item) {
    if (!checkDeskPolicy(path)) {
        showFileNotice(`「${path}」篩選未通過，已開啟編輯器但未加入工作桌。`);
        return;
    }

    deskReferences.set(path, item);
    showFileNotice(`「${path.split("/").pop()}」已加入工作桌。`);
    renderDesk();
}

/** Render selected references after applying the latest filter policy. */
function renderDesk() {
    const list = document.getElementById("deskFiles");
    const count = document.getElementById("deskFileCount");
    const hint = document.querySelector(".desk-hint");

    if (!list || !count) return;

    const allowedFiles = new Map(
        getAllowedProjectFiles().map(file => [file.path, file.item])
    );
    const references = [...deskReferences.entries()]
        .filter(([path]) => allowedFiles.has(path));

    list.replaceChildren();
    count.textContent = `${references.length} 個參考檔案`;

    if (!references.length) {
        const empty = document.createElement("p");
        empty.className = "empty-project";
        empty.textContent = deskReferences.size
            ? "已加入的檔案目前都被篩選規則排除。"
            : "尚未加入檔案。請在檔案櫃按住 Shift 再左鍵點選檔案。";
        list.appendChild(empty);
        if (hint) hint.textContent = "檔案櫃按 Shift+左鍵加入；工作桌按 Shift+左鍵移出。一般左鍵會在編輯器開啟檔案。";
        return;
    }

    if (hint) hint.textContent = "檔案櫃按 Shift+左鍵加入；工作桌按 Shift+左鍵移出。一般左鍵會在編輯器開啟檔案。";

    for (const [path, item] of references) {
        list.appendChild(createDeskEntry(path, item));
    }
}

/** Create a work desk row with a filename, optional reference details and actions. */
function createDeskEntry(path, item) {
    const policy = getDeskPolicy();
    const entry = document.createElement("div");
    entry.className = "desk-file-entry";

    const openButton = document.createElement("button");
    openButton.className = "desk-file";
    openButton.type = "button";
    openButton.title = `左鍵：在編輯器開啟\nShift+左鍵：從工作桌移除\n${path}`;

    const label = document.createElement("span");
    label.textContent = path.split("/").pop();
    openButton.appendChild(label);

    // 一般左鍵開檔；Shift+左鍵則從工作桌移出，不觸發編輯器載入。
    openButton.addEventListener("click", async event => {
        if (event.shiftKey) {
            event.preventDefault();
            deskReferences.delete(path);
            renderDesk();
            showFileNotice(`「${path.split("/").pop()}」已從工作桌移除。`);
            return;
        }

        const content = await openFile({ ...item, path });

        if (content != null && policy.output.full) {
            let preview = entry.querySelector("pre");
            if (!preview) {
                preview = document.createElement("pre");
                preview.className = "desk-file-content";
                entry.appendChild(preview);
            }
            preview.textContent = content;
        }
    });

    entry.appendChild(openButton);

    if (policy.output.reference || policy.output.metadata) {
        const details = document.createElement("small");
        details.className = "desk-file-reference";
        details.textContent = [
            policy.output.reference ? `引用：${path}` : "",
            policy.output.metadata ? `語法：.${path.split(".").pop()}` : ""
        ].filter(Boolean).join(" · ");
        entry.appendChild(details);
    }

    return entry;
}

// 儲存篩選規則後，重新計算工作桌上每個參考檔案的可見狀態。
document.addEventListener("desk-policy-changed", () => {
    if (deskMode) renderDesk();
});

document.addEventListener("editor-notice", (event) => {
    if (event.detail?.message) {
        showFileNotice(event.detail.message);
    }
});

/** Build one explorer row or recursively build a folder and its children. */
function createDirectoryElement(item, parentPath, isProjectRoot = false) {
    const container = document.createElement("div");
    container.className = "tree-item";

    const row = document.createElement("div");
    row.className = "tree-row";

    const icon = document.createElement("span");
    const name = document.createElement("span");
    name.textContent = item.name;

    if (item.type === "directory") {
        icon.textContent = "📁";
        row.append(icon, name);

        const childrenContainer = document.createElement("div");
        childrenContainer.className = "tree-children";
        childrenContainer.hidden = true;

        row.addEventListener("click", event => {
            event.preventDefault();
            childrenContainer.hidden = !childrenContainer.hidden;
            icon.textContent = childrenContainer.hidden ? "📁" : "📂";
        });

        // 專案根目錄只作為樹狀標題，不加入相對路徑。
        const folderPath = isProjectRoot
            ? parentPath
            : parentPath
                ? `${parentPath}/${item.name}`
                : item.name;

        for (const child of item.children ?? []) {
            childrenContainer.appendChild(
                createDirectoryElement(child, folderPath)
            );
        }

        container.append(row, childrenContainer);
        return container;
    }

    if (item.type === "file") {
        icon.textContent = getFileIcon(item.name);
        row.append(icon, name);

        const path = parentPath
            ? `${parentPath}/${item.name}`
            : item.name;

        row.title = eventTitle(path);
        row.addEventListener("click",async event => {
            event.preventDefault();

              if (event.ctrlKey) {
                    const confirmed = confirm(`確定刪除「${item.name}」嗎？`);

                    if (!confirmed) return;

                    await deleteProjectFile({ ...item, path });

                    renderFileExplorer();
                    return;
                }

            // Shift+左鍵會同時開啟編輯器並加入工作桌。
            if (event.shiftKey) addDeskReference(path, item);
            openFile({ ...item, path });
        });

        container.appendChild(row);
    }

    return container;
}

function eventTitle(path) {
    return `左鍵：在編輯器開啟\nShift+左鍵：開啟並加入工作桌\n${path}`;
}

/** Return a familiar icon based on the file extension. */
function getFileIcon(filename) {
    const extension = filename.split(".").pop().toLowerCase();
    const icons = {
        ex: "💧", exs: "💧", js: "🟨", json: "📋", html: "🌐",
        css: "🎨", md: "📝", txt: "📄", gitignore: "🔧", env: "🔒",
        lock: "🔐", toml: "⚙️", yaml: "⚙️", yml: "⚙️", sql: "🗄️",
        png: "🖼️", jpg: "🖼️", jpeg: "🖼️", svg: "🖼️", pdf: "📕"
    };

    return icons[extension] || "📄";
}
