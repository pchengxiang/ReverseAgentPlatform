import { openDeskFilter } from "./desk/desk_filter.js";
import { setWorkspaceMode } from "./directory/file_explorer.js"

const menuButton = document.getElementById(
    "choose_operation"
);

const menu = document.getElementById(
    "workspaceMenu"
);
const settingsButton = document.getElementById("settingsButton");
const toggleAiPanelButton = document.getElementById("toggleAiPanel");
const closeAiPanelButton = document.getElementById("closeAiPanel");
const aiPanel = document.getElementById("aiPanel");

// The header settings shortcut opens the existing desk filter settings.
settingsButton.addEventListener("click", openDeskFilter);

function setAiPanelOpen(open) {
    if (!aiPanel || !toggleAiPanelButton) return;
    aiPanel.classList.toggle("hidden", !open);
    document.body.classList.toggle("ai-panel-open", open);
    toggleAiPanelButton.setAttribute("aria-expanded", String(open));
}

toggleAiPanelButton?.addEventListener("click", () => {
    const isOpen = document.body.classList.contains("ai-panel-open");
    setAiPanelOpen(!isOpen);
});

closeAiPanelButton?.addEventListener("click", () => setAiPanelOpen(false));

document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        const isOpen = document.body.classList.contains("ai-panel-open");
        setAiPanelOpen(!isOpen);
    }
});


// 開啟與關閉選單
menuButton.addEventListener("click", () => {
    menu.classList.toggle("hidden");
    
});


// 點擊選單項目
menu.addEventListener("click", (event) => {

    const button = event.target.closest("[data-action]");

    if (!button) return;

    const action = button.dataset.action;

    handleWorkspaceAction(action);

    menu.classList.add("hidden");

});


// 點擊選單外部，自動關閉
document.addEventListener("click", (event) => {

    const workspaceMenu = document.querySelector(
        ".workspace-menu"
    );

    if (!workspaceMenu.contains(event.target)) {

        menu.classList.add("hidden");

    }

});


// 按下 ESC 關閉
document.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {

        menu.classList.add("hidden");

    }

});


// 處理操作
function handleWorkspaceAction(action) {

    switch (action) {

        case "desk":
            setWorkspaceMode("desk");
            break;

        case "explorer":
            console.log("切換檔案櫃模式");
            setWorkspaceMode("explorer");
            break;

        case "new-project-file":
            console.log("新增專案檔案");
            break;

        case "filter-settings":
            console.log("開啟篩選設定");
            openDeskFilter()
            break;

    }

}
