import { renderFileExplorer } from "./file_explorer.js";
import { openFile } from "../editor/editor.js";

var openProjectButton = document.querySelector("#openProject")
let directoryHandle = null;
let projectStructure = null;

// 選擇專案
openProjectButton.addEventListener("click", async () => {
    try {
        directoryHandle = await window.showDirectoryPicker({
            mode: "readwrite"
        });

        console.log("已選擇專案：", directoryHandle.name);

        projectStructure = await scanDirectory(directoryHandle);

        console.log("專案結構：", projectStructure);

        renderFileExplorer(projectStructure);

    } catch (error) {
        if (error.name === "AbortError") {
            console.log("使用者取消選擇");
            return;
        }

        console.error("專案讀取失敗：", error);
    }
});


// 遞迴掃描資料夾
// async function scanDirectory(directoryHandle) {

//     const directory = {
//         name: directoryHandle.name,
//         type: "directory",
//         children: []
//     };

//     for await (const entry of directoryHandle.values()) {

//         if (entry.kind === "directory") {

//             // 遇到資料夾，繼續遞迴
//             const childDirectory = await scanDirectory(entry);

//             directory.children.push(childDirectory);

//         } else {

//             // 遇到檔案
//             directory.children.push({
//                 name: entry.name,
//                 type: "file",
//                 handle: entry
//             });

//         }
//     }

//     return directory;
// }



async function scanDirectory(directoryHandle) {
    const directory = {
        name: directoryHandle.name,
        type: "directory",
        children: [],
        handle: directoryHandle,
    };

    for await (const entry of directoryHandle.values()) {
        console.log(
            "掃描項目：",
            entry.name,
            "類型：",
            entry.kind
        );

        if (entry.kind === "directory") {
            const childDirectory = await scanDirectory(entry);
            directory.children.push(childDirectory);

        } else if (entry.kind === "file") {
            directory.children.push({
                name: entry.name,
                type: "file",
                handle: entry,
                parentHandle: directoryHandle
            });
        }
    }

    console.log(
        `資料夾 ${directoryHandle.name}，項目數：`,
        directory.children.length
    );

    return directory;
}

//工作:確認目前有開啟專案。 在專案根目錄建立實際檔案。 把新檔案加入 projectStructure。 重新渲染檔案樹。
export async function createProjectFile(filename) {
    if (!directoryHandle) return;

    const fileHandle = await directoryHandle.getFileHandle(
        filename,
        { create: true }
    );

    const existingFile = projectStructure.children.find(
        child => child.type === "file" && child.name === filename
    );

    if (existingFile) {
        existingFile.handle = fileHandle;
        existingFile.parentHandle = directoryHandle;
    } else {
        projectStructure.children.push({
            name: filename,
            type: "file",
            handle: fileHandle,
            parentHandle: directoryHandle
        });
    }

    renderFileExplorer(projectStructure);

    return fileHandle;
}


const newFileButton = document.querySelector("#newFileButton");

newFileButton.addEventListener("click", async () => {
    const filename = prompt("請輸入檔案名稱：");

    if (!filename) return;

    try {
        const fileHandle = await createProjectFile(filename);
        if (!fileHandle) return;

        await openFile({
            name: filename,
            type: "file",
            handle: fileHandle
        });

    } catch (error) {
        console.error("新增檔案失敗：", error);
    }
});

function findParentDirectory(directory, targetPath, parentPath = "") {
    for (const child of directory.children) {
        const path = parentPath
            ? `${parentPath}/${child.name}`
            : child.name;

        if (path === targetPath) {
            return directory;
        }

        if (child.type === "directory") {
            const result = findParentDirectory(
                child,
                targetPath,
                path
            );

            if (result) return result;
        }
    }

    return null;
}

export async function deleteProjectFile(item) {
    const parent = findParentDirectory(projectStructure, item.path);
    const parentHandle = item.parentHandle ?? parent?.handle;

    if (!parentHandle) {
        throw new Error(`找不到「${item.name}」的父目錄 handle`);
    }

    await parentHandle.removeEntry(item.name);

    if (parent) {
        parent.children = parent.children.filter(
            child => child.name !== item.name
        );
    }

    renderFileExplorer(projectStructure);
}