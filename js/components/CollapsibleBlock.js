import { createElement, qs } from "../utils/helper.js"

class CollapsibleBlock extends HTMLElement {
    constructor() {
        super()
        this.panels = []

        this.buildWrapper()
    }

    buildWrapper() {
        this.wrapper = createElement("div", { class: "collapsible-wrapper" })
        this.wrapper.addEventListener("click", (e) => {
            // e.stopPropagation();

            const isIgnoreCollapse = e.target.matches("[data-ignore-collapse]")
            if (isIgnoreCollapse) return

            e.preventDefault()

            const panel = e.target.closest("[data-collapsible-panel]")
            if (panel == null) return

            const button = qs("[data-collapse-trigger]", panel)
            const contentEl = qs("[data-collapsible-content]", panel)
            const isOpened = button.classList.contains("expanded")

            contentEl.style.gridTemplateRows = isOpened ? "0fr" : "1fr"
            button.classList.toggle("expanded", !isOpened)
        })

        this.appendChild(this.wrapper)
    }

    buildPanel(title, contentNode) {
        const panel = createElement("div", { class: "collapsible-panel", dataset: { collapsiblePanel: "" } })
        const titleEl = createElement("div", { class: "collapsible-panel-title" })
        const button = createElement("button", {
            class: "collapse-trigger",
            dataset: {
                collapseTrigger: "",
            },
            text: title,
        })

        const caret = createElement("span", { class: "collapsible-caret" })

        titleEl.appendChild(button)
        titleEl.appendChild(caret)

        const contentEl = createElement("div", {
            class: "collapsible-content",
            dataset: {
                collapsibleContent: "",
            },
            style: "display: grid; grid-template-rows: 0fr;",
            // style: "display: grid; grid-template-rows: 0fr; transition: grid-template-rows 500ms;",
        })
        
        const contentInnerEl = createElement("div")
        contentInnerEl.style.overflow = "hidden"

        contentInnerEl.appendChild(contentNode)
        contentEl.appendChild(contentInnerEl)

        panel.appendChild(titleEl)
        panel.appendChild(contentEl)
        this.wrapper.appendChild(panel)

        this.panels.push(panel)
    }
}

customElements.define("collapsible-block", CollapsibleBlock)

export default CollapsibleBlock
