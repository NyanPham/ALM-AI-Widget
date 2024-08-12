import CollapsibleBlock from "./CollapsibleBlock.js"
import { createElement, slugify } from "../utils/helper.js"

class ArtifactsImportPreview extends HTMLElement {
    constructor(artsData, title) {
        super()

        this.artsData = artsData
        this.title = title
        this.checkboxes = []
        this.selectAllCheckBox = null
    }

    handleCheckboxChange(e) {
        e.preventDefault()

        this.selectAllCheckBox.checked = this.checkboxes.every((checkbox) => checkbox.checked)
    }

    static handleAllCheckboxChange(e, artsImportPreview) {
        artsImportPreview.checkboxes.forEach((checkbox) => (checkbox.checked = e.target.checked))
        e.target.closest(".preview-title").click()
    }

    static getResults(artsImportPreview) {
        return artsImportPreview.checkboxes.reduce((importData, checkbox) => {
            if (checkbox.checked == false) return importData

            return [...importData, JSON.parse(checkbox.dataset.checkboxData)]
        }, [])
    }

    static buildSelectCheckbox(artsImportPreview, contentEl, checkboxData) {
        const { ID: title } = checkboxData
        const titleWithoutSpace = slugify(title)

        const itemInfoEl = createElement("div", { class: "item-info" })

        const checkbox = createElement("input", {
            type: "checkbox",
            value: title,
            name: titleWithoutSpace,
            id: titleWithoutSpace,
            class: "import-checkbox",
            dataset: {
                checkboxData: JSON.stringify(checkboxData),
            },
        })

        checkbox.addEventListener("change", artsImportPreview.handleCheckboxChange.bind(artsImportPreview))
        artsImportPreview.checkboxes.push(checkbox)

        const label = createElement("label", {
            class: "item-label",
            for: titleWithoutSpace,
        })

        const titleEl = createElement("h5", { text: title, class: "item-title" })
        label.appendChild(titleEl)

        const collapsibleBlockData = {
            artifactData: checkboxData,
            itemBlock: label,
        }

        ArtifactsImportPreview.buildContentCollapsibleBlock(collapsibleBlockData)

        itemInfoEl.appendChild(checkbox)
        itemInfoEl.appendChild(label)

        contentEl.appendChild(itemInfoEl)

        return checkbox
    }

    static buildContentCollapsibleBlock(collapsibleBlockData) {
        const { artifactData, itemBlock } = collapsibleBlockData

        const artifactPropertiesList = createElement("ul")

        Object.entries(artifactData).forEach(([key, value]) => {
            const li = createElement("li")
            const liContent = createElement("span", { class: "li-content" })
            liContent.innerHTML = `${key}: ${value}`
            li.appendChild(liContent)
            artifactPropertiesList.appendChild(li)
        })

        const collapsibleBlock = new CollapsibleBlock()
        collapsibleBlock.buildPanel("Artifact Properties", artifactPropertiesList)

        itemBlock.appendChild(collapsibleBlock)
    }

    static buildContentChangeCheckboxes(artsImportPreview, contentEl) {
        artsImportPreview.artsData.forEach((data) => {
            return ArtifactsImportPreview.buildSelectCheckbox(artsImportPreview, contentEl, data)
        })
    }

    static buildContent(artsImportPreview) {
        const contentEl = createElement("div", { class: "content" })
        ArtifactsImportPreview.buildContentChangeCheckboxes(artsImportPreview, contentEl)

        artsImportPreview.contentsWrapper.appendChild(contentEl)
    }

    static buildHtml(artsImportPreview) {
        artsImportPreview.wrapper = createElement("div", { class: "artifacts-preview-wrapper" })
        artsImportPreview.appendChild(artsImportPreview.wrapper)

        artsImportPreview.titleEl = createElement("p", { text: artsImportPreview.title, class: "preview-title" })
        artsImportPreview.wrapper.appendChild(artsImportPreview.titleEl)

        const checkAllLabel = createElement("label", { text: "Select all", class: "item-label", for: "import-all-arts" })
        artsImportPreview.selectAllCheckBox = createElement("input", { type: "checkbox", class: "import-checkbox", id: "import-all-arts" })
        artsImportPreview.titleEl.appendChild(artsImportPreview.selectAllCheckBox)
        artsImportPreview.titleEl.appendChild(checkAllLabel)

        artsImportPreview.selectAllCheckBox.addEventListener("change", (e) => {
            ArtifactsImportPreview.handleAllCheckboxChange(e, artsImportPreview)
        })

        artsImportPreview.contentsWrapper = createElement("div", { class: "contents-wrapper" })
        artsImportPreview.wrapper.appendChild(artsImportPreview.contentsWrapper)
    }

    static buildStyles(artsImportPreview) {
        const styles = `
            .artifacts-preview-wrapper {
                width: 75vw;
            }

            .preview-title {
                margin-top: 0;
                font-size: 1rem;
                margin-bottom: 1rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .contents-wrapper {
                padding: 0 1rem;
                padding-bottom: 0.5rem;
                height: var(--max-height);
                overflow-y: auto;
            }

            .item-info {
                position: relative;
                padding: 0.75rem;
                border-radius: 3px;
                border: 1px solid rgba(0, 0, 0, 0.3);
            }


            .import-checkbox[type="checkbox"] {
                display: none;
            }

            .import-checkbox[type="checkbox"] + .item-label {
                display: block;
                position: relative;
                padding-left: 30px;
                cursor: pointer;
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
            }

            .import-checkbox[type="checkbox"] + .item-label::before {
                content: "";
                display: block;
                width: 1rem;
                height: 1rem;   
                border: 1px solid #343a3f;
                border-radius: 0.2em;
                position: absolute;
                left: 0;
                top: 0;
                // -webkit-transition: all 0.2s, background 0.2s ease-in-out;
                // transition: all 0.2s, background 0.2s ease-in-out;
                // background: #f3f3f3;
            }

            .import-checkbox[type="checkbox"]:disabled + label::before {
                opacity: 0.5;
                background: #fafafa;
                border-color: #fafafa;
                cursor: not-allowed;
            }

            .import-checkbox[type="checkbox"]:checked + label::before {
                width: 1.1em;
                height: 1.1em;
                border-radius: 0.2em;
                border: 2px solid #fff;
                -webkit-transform: rotate(90deg);
                transform: rotate(90deg);
                background: #0f62fe;
                box-shadow: 0 0 0 1px #0f62fe;
            }   

            .import-checkbox[type="checkbox"] + .item-label {
                padding-left: 25px;
            }

            .import-checkbox[type="checkbox"] + .item-label::before {
                top: -2px;
            }

            .import-checkbox[type="checkbox"] + .item-label.inner-select-all-label {
                font-weight: 500;
                font-style: italic;
                text-align: right;
                padding-top: 5px;
                padding-bottom: 3px;
                padding-left: 0;
                padding-right: 20px;
                margin-left: 2rem;
                margin-right: 1rem;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            }    

            .import-checkbox[type="checkbox"] + .item-label.inner-select-all-label::before {
                width: 0.7rem;
                height: 0.7rem;

                left: unset;
                right: 0;
                top: 5px;
            }
        `

        artsImportPreview.style.setProperty("--max-height", "50vh")

        const customStyle = createElement("style")
        customStyle.innerHTML = styles
        artsImportPreview.appendChild(customStyle)

        const collapsibleStyles = `
            .collapsible-wrapper {
                margin-top: 1rem;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .collapsible-panel {
                cursor: pointer;
                width: max-content;
            }

            .collapse-trigger {
                border: none;
                background: none;
                cursor: pointer;
                margin-right: 0.5rem;
            }

            .collapsible-panel-title {
                width: max-content;
                position: relative;
            }   

            .collapsible-caret {
                --rotate: 45deg;

                border: solid black;
                border-width: 0 2px 2px 0;
                display: inline-block;
                padding: 2px;
                width: 0;
                height: 0;
                transform: rotate(var(--rotate));
                margin-bottom: 2px;

                transition: transform 350ms ease-in-out;
            }   

            .collapse-trigger.expanded + .collapsible-caret {
                --rotate: -135deg;
            }

            .collapsible-content {
                max-width: 350px;
            }   

            .collapsible-content ul {
                padding-left: 2rem;
            }

            .collapsible-content li {
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .collapsible-content li::before {
                content: '';
                display: block;
                width: 3px;
                height: 3px;
                border-radius: 50%;
                background: #333;
                flex-shrink: 0;
            }
            
            .content-heading {
                position: sticky;
                top: 0;
                left: 0;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.65rem 0;
                background: white;
                z-index: 1;
            }

            .content-heading::before {
                content: '';
                display: block;
                position: absolute;
                top: 0;
                left: -1rem;
                width: calc(100% + 2rem);
                height: 100%;
                background: white;
                z-index: -1;
                box-shadow: 0 0 5px 2px rgba(0, 0, 0, 0.1);
            }
            
            .content-heading-text {
                margin: 0;
                padding: 0;
                user-select: none;
            }

            .content-heading .import-checkbox[type="checkbox"] + .item-label {
                padding-left: 25px;
            }

            .content-heading .import-checkbox[type="checkbox"] + .item-label::before {
                top: -2px;
            }

            .import-checkbox[type="checkbox"] + .item-label.inner-select-all-label {
                font-weight: 500;
                font-style: italic;
                text-align: right;
                padding-top: 5px;
                padding-bottom: 3px;
                padding-left: 0;
                padding-right: 20px;
                margin-left: 2rem;
                margin-right: 1rem;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            }       

            .inner-select-all-label,
            .inner-select-all-checkbox {
                cursor: pointer;
            }

            inner-select-all-checkbox {
                display: none;
            }

            .import-checkbox[type="checkbox"] + .item-label.inner-select-all-label::before {
                width: 0.7rem;
                height: 0.7rem;

                left: unset;
                right: 0;
                top: 5px;
            }

            .import-checkbox[type="checkbox"]:checked + .item-label.inner-select-all-label::before,
            .optional-dependency-checkbox.import-checkbox[type="checkbox"]:checked + .item-label::before {
                border-width: 1.5px;
            }   

            .right-heading-el {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 0.5rem;
                border: 1px solid rgba(0, 0, 0, 0.2);
                padding: 0.35rem 0.5rem;
                border-radius: 30px;
                cursor: pointer;
            }   

            .right-heading-el::after {
                content: "";
                --rotate: 45deg;
                border: solid black;
                border-width: 0 2px 2px 0;
                display: inline-block;
                padding: 2px;
                width: 0;
                height: 0;
                transform: rotate(var(--rotate));
                margin-bottom: 2px;
                transition: transform 350ms ease-in-out;
            }   

            .right-heading-panel {
                position: absolute;
                top: calc(100% + 5px);
                right: 0;
                width: max-content;
                display: flex;
                flex-direction: column;
                gap: 0.45rem;
                background: white;
                box-shadow: 0 0px 10px 2px rgba(0, 0, 0, 0.1);
                padding: 0.5rem 1rem;
                border-radius: 3px;

                transform: translateY(-3px);
                opacity: 0;
                transition-property: transform, opacity;
                transition-duration: 250ms;
                transition-timing-function: ease-in-out;
            }

            .right-heading-el.show {
                border-color: #0353e9;
                color: #0353e9;
            }

            .right-heading-el.show::after {
                --rotate: -135deg;
                border-color: #0353e9;
            }

            .right-heading-el.show .right-heading-panel {
                opacity: 1;
                transform: translateY(0);
                color: initial;
            }   
            
            .li-content {
                word-break: break-word;
            }
        `

        const accordionStyles = createElement("style")
        accordionStyles.innerHTML = collapsibleStyles
        artsImportPreview.appendChild(accordionStyles)
    }
}

customElements.define("artifacts-preview", ArtifactsImportPreview)

export default ArtifactsImportPreview
