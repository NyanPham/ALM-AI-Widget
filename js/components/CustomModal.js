import { commonModalScript } from "./commonModalScript.js"
import { createElement } from "../utils/helper.js"

export const MODAL_HANDLE_CODE = {
    operationCancel: "OPERATION_CANCELLED",
    ok: "OK",
}

class CustomModal {
    constructor(title, contentElement, container, footerConfig = {}, submitHandler = null, docClickHandler = null) {
        this.title = title
        this.container = container
        this.contentElement = contentElement
        this.footerConfig = footerConfig
        this.submitHandler = submitHandler
        this.docClickHandler = docClickHandler
    }

    build({ disableSubmit = false } = {}) {
        this.header = this.buildHeader()
        this.content = this.buildContent()
        this.closeBtn = this.buildCloseButton()
        this.frontModal = this.buildFrontModal()
        this.loadingLayer = this.buildLoadingLayer()
        this.footer = this.buildFooter(this.footerConfig)

        this.header.appendChild(this.closeBtn)
        this.frontModal.appendChild(this.header)
        this.frontModal.appendChild(this.content)

        if (this.footer) {
            this.frontModal.appendChild(this.footer)
        }

        this.modalUnderlay = this.buildModalUnderlay()
        this.rootBgOverlay = this.buildRootOverlay()

        this.rootBgOverlay.appendChild(this.modalUnderlay)
        this.rootBgOverlay.appendChild(this.frontModal)

        if (this.style != null) {
            this.content.appendChild(this.style)
        }

        this.container.appendChild(this.rootBgOverlay)

        setTimeout(() => {
            this.rootBgOverlay.classList.add("is-visible")
            this.modalUnderlay.classList.add("is-visible")
            this.frontModal.classList.add("is-visible")
            this.loadingLayer.style.top = this.header.clientHeight + 8 + "px"
        }, 100)

        this.cancelBtn = this.footer.querySelector(".j-button-secondary")
        this.submitBtn = this.footer.querySelector(".j-button-primary")

        if (disableSubmit) this.submitBtn.disabled = true

        if (this.docClickHandler != null && typeof this.docClickHandler === "function") {
            this.frontModal.addEventListener("click", (e) => {
                this.docClickHandler(e, this.submitBtn)
            })
        }

        const cancel = (resolve) => {
            this.destroy()

            resolve({
                code: MODAL_HANDLE_CODE.operationCancel,
            })
        }

        const submit = (resolve) => {
            this.destroy()

            resolve({
                code: MODAL_HANDLE_CODE.ok,
                data: this.submitHandler != null && typeof this.submitHandler === "function" ? this.submitHandler() : [],
            })
        }

        return new Promise((resolve, reject) => {
            this.cancelBtn.addEventListener("click", () => cancel(resolve))
            this.closeBtn.addEventListener("click", () => cancel(resolve))
            this.submitBtn.addEventListener("click", () => submit(resolve))
        })
    }

    addStyles(styleCSS) {
        this.style = createElement("style")
        // this.style.setHTML(styleCSS);
        this.style.innerHTML = styleCSS
    }
}

Object.assign(CustomModal.prototype, commonModalScript)
export default CustomModal
