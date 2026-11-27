
// =================================
// 1. 取得 HTML 元素
// =================================

const body = document.body;
const main = document.querySelector("main");

const horizontalResizer = document.querySelector(
    ".horizontal-resizer"
);

const verticalResizer = document.querySelector(
    ".vertical-resizer"
);


// =================================
// 2. 左右面板尺寸調整
// =================================

horizontalResizer.addEventListener("pointerdown", (event) => {
    event.preventDefault();

    horizontalResizer.setPointerCapture(event.pointerId);

    function move(e) {
        const minWidth = 150;
        const maxWidth = window.innerWidth * 0.5;

        const width = Math.min(
            Math.max(e.clientX, minWidth),
            maxWidth
        );

        body.style.setProperty("--left-width", `${width}px`);
    }

    function stop() {
        horizontalResizer.removeEventListener(
            "pointermove", move
        );

        horizontalResizer.removeEventListener(
            "pointerup", stop
        );

        horizontalResizer.removeEventListener(
            "pointercancel", stop
        );
    }

    horizontalResizer.addEventListener("pointermove", move);

    horizontalResizer.addEventListener("pointerup", stop);

    horizontalResizer.addEventListener("pointercancel", stop);
});


// =================================
// 3. 上下工作區尺寸調整
// =================================

verticalResizer.addEventListener("pointerdown", (event) => {
    event.preventDefault();

    verticalResizer.setPointerCapture(event.pointerId);

    function move(e) {
        const rect = main.getBoundingClientRect();

        const minEditorHeight = 150;
        const minOutputHeight = 100;

        const availableHeight = rect.height - 5;

        const outputHeight = Math.min(
            Math.max(
                rect.bottom - e.clientY,
                minOutputHeight
            ),
            availableHeight - minEditorHeight
        );

        main.style.gridTemplateRows =
            `minmax(0, 1fr) 5px ${outputHeight}px`;
    }

    function stop() {
        verticalResizer.removeEventListener(
            "pointermove", move
        );

        verticalResizer.removeEventListener(
            "pointerup", stop
        );

        verticalResizer.removeEventListener(
            "pointercancel", stop
        );
    }

    verticalResizer.addEventListener("pointermove", move);

    verticalResizer.addEventListener("pointerup", stop);

    verticalResizer.addEventListener("pointercancel", stop);
});
