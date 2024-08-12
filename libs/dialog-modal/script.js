// Start: Draggable modal
const dragItem = {
    element: null,
    x: 0,
    y: 0,
}

const mouse = { x: 0, y: 0 }

export function dragInit(elem) {
    dragItem.element = elem
    dragItem.x = mouse.x - dragItem.element.offsetLeft
    dragItem.y = mouse.y - dragItem.element.offsetTop
}

export function dragMove(e) {
    mouse.x = e.clientX
    mouse.y = e.clientY

    if (dragItem.element != null) {
        setStyleProperty(dragItem.element, "--top", `${mouse.y - dragItem.y}px`)
        setStyleProperty(dragItem.element, "--left", `${mouse.x - dragItem.x}px`)
    }
}

export function dragEnd() {
    dragItem.element = null
}

export function handleDialogHeadingMouseDown(e) {
    const dialog = e.target.closest("[data-dialog]")
    if (dialog == null) return
    dragInit(dialog)
}

export function handleDialogHeadingMouseUp(e) {
    dragEnd()
}

export function handleMouseMove(e) {
    dragMove(e)
}
// End: Draggable modal

// Start: Handle modal show with animation
export async function waitForDialogReady(dialogModal) {
    if (!dialogModal.open) return
    
    await new Promise((resolve) => {
        requestAnimationFrame(() => {
            if (!dialogModal.classList.contains("close")) resolve()
            const WAIT_OFFSET = 300
            const transitionDuration = parseInt(getComputedStyle(dialogModal).getPropertyValue("--transition-duration")) + WAIT_OFFSET
            setTimeout(() => resolve(), transitionDuration)
        })  
    })
}

export function showDialogWithTransition(dialogModal) {
    dialogModal.showModal()
    requestAnimationFrame(() => {
        dialogModal.classList.add("show")
    })
}

export function closeDialogWithTransition(dialogModal) {
    dialogModal.addEventListener("transitionend", onCloseTransitionEnd)
    requestAnimationFrame(() => {
        dialogModal.classList.add("close")
    })
}

function onCloseTransitionEnd(e) {
    let dialogModal
    if (e.target.matches("dialog[data-dialog]")) dialogModal = e.target
    else if (e.target.closest("dialog[data-dialog]") != null) dialogModal = e.target.closest("dialog[data-dialog]")
    if (dialogModal == null || e.target.dataset?.transition == null) return

    dialogModal.classList.remove("show")
    dialogModal.classList.remove("close")
    dialogModal.close()
    dialogModal.removeEventListener("transitionend", onCloseTransitionEnd)
}

function showModalOnStack(dialogModal, dialogs) {
    const offset = 18
    const totalOffset = dialogs.filter((dialog) => dialog.open).length * offset

    const currentTop = getStyleProperty(dialogModal, "--top")
    const currentLeft = getStyleProperty(dialogModal, "--left")

    const top = `calc(${currentTop} + ${totalOffset}px)`
    const left = `calc(${currentLeft} + ${totalOffset}px)`

    setStyleProperty(dialogModal, "--top", top)
    setStyleProperty(dialogModal, "--left", left)

    dragEnd()
    dialogModal.showModal()
}

// Submit call back example
// const submitCallback = (e, resolve) => {
//     if (e.submitter.matches("[data-cancel-btn]") || viewNameInput.value === "") {
//         resolve({
//             code: "CANCEL",
//             viewName: null,
//         });
//     } else {
//         resolve({
//             code: "OK",
//             viewName: viewNameInput.value,
//         });
//     }
// };
// Submit call back example

function setStyleProperty(element, name, value) {
    element.style.setProperty(name, value)
}
