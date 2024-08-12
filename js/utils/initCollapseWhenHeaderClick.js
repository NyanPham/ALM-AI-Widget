import { qs, qsa } from "./helper.js"

export default function initCollapseWhenHeaderClick() {
    const dashboardIframe = window.frameElement
    
    const toggleWidgetCollapse = (targetDropdown) => {
        const toggleTr = qs('[aria-label^="Collapse"]', targetDropdown) || qs('[aria-label^="Expand"]', targetDropdown)
        toggleTr.click()
    }

    const styledBoxId = window.frameElement.closest(".jazz-ensemble-internal-WidgetContainer")?.getAttribute("id")

    window.parent.document.body.addEventListener("click", (e) => {
        let header

        if (e.target.matches(".jazz-ui-StyledBox-header")) {
            header = e.target
        } else if (e.target.closest(".jazz-ui-StyledBox-header") != null) {
            header = e.target.closest(".jazz-ui-StyledBox-header")
        }

        if (header == null) return

        const clickedStyledBoxId = header.closest(".jazz-ensemble-internal-WidgetContainer")?.getAttribute("id")
        if (styledBoxId !== clickedStyledBoxId) return

        const dashboardParent = dashboardIframe.closest(`[id="${styledBoxId}"]`)
        const toolset = qs('[widgetid^="jazz_ui_SimpleToolbar"]', dashboardParent)
        const popupDiv = [...toolset.children].find((child) => {
            const a = qs("a", child)
            return a.getAttribute("title") === "Menu"
        })
        const menuLink = qs("a", popupDiv)
        menuLink.click()
        menuLink.click()

        setTimeout(() => {
            const popupId = qs("a", popupDiv).getAttribute("widgetid")
            const targetDropdown = qs(`[dijitpopupparent="${popupId}"]`, parent.window.document)
            toggleWidgetCollapse(targetDropdown)
        }, 150)
    })
}
