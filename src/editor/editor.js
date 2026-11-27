import * as monaco from "monaco-editor";
import { editor } from "../main.js"

let currentFile = null;
let isSaving = false;
let titleTimer = null;

function flashSavedTitle(filename) {
    window.clearTimeout(titleTimer);
    document.title = `已儲存 ${filename} - Coding Platform`;
    titleTimer = window.setTimeout(() => {
        document.title = "Coding Platform";
    }, 2000);
}

// 開啟檔案
export async function openFile(item) {
    let file;
    let content;
    try {
        if(item.content != null){
            file = item
            content = item.content
        }else{
            file = await item.handle.getFile();
            content = await file.text();
        }
        
        
        

        // 判斷副檔名
        const extension = item.name.split(".").pop().toLowerCase();

        const languageMap = {
            ex: "elixir",
            exs: "elixir",
            js: "javascript",
            json: "json",
            html: "html",
            css: "css",
            md: "markdown",
            txt: "plaintext"
        };

        const language = languageMap[extension] || "plaintext";

        // 更新 Monaco 內容
        const model = monaco.editor.createModel(
            content,
            language
        );

        editor.setModel(model);
        currentFile = item;

        monaco.editor.setModelLanguage(model, language);
        editor.focus();
        console.log("已開啟檔案：", item.path || item.name);
        return content;

    } catch (error) {
        console.error("檔案開啟失敗：", error);
    }
}

// 儲存目前開啟的檔案回本機
export async function saveCurrentFile() {
    if (isSaving) return false;

    if (!currentFile?.handle) {
        console.warn("目前沒有可寫回本機的檔案");
        return false;
    }

    isSaving = true;
    try {
        if (currentFile.handle.queryPermission) {
            const permission = await currentFile.handle.queryPermission({ mode: "readwrite" });
            if (permission !== "granted") {
                const requested = await currentFile.handle.requestPermission({ mode: "readwrite" });
                if (requested !== "granted") {
                    console.warn("尚未取得檔案寫入權限");
                    return false;
                }
            }
        }

        const writable = await currentFile.handle.createWritable();
        await writable.write(editor.getValue());
        await writable.close();

        console.log("已儲存檔案：", currentFile.path || currentFile.name);
        flashSavedTitle(currentFile.name);
        document.dispatchEvent(new CustomEvent("editor-notice", {
            detail: { message: `已存檔：${currentFile.name}` }
        }));
        return true;
    } catch (error) {
        console.error("檔案儲存失敗：", error);
        return false;
    } finally {
        isSaving = false;
    }
}

editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    saveCurrentFile();
});

window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!editor.hasTextFocus()) {
            saveCurrentFile();
        }
    }
});
