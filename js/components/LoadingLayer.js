import { createElement } from "../utils/helper.js"

class LoadingLayer extends HTMLElement {
    #loadingText
    #loadingProgressOuter
    #loadingProgressInner
    #abortButton
    #abortHandler

    constructor() {
        super()

        this.build()
        this.addStyles()
    }
    
    toggleAbortable(abortHandler, abortable = false) {
        if (abortHandler != null) {
            this.#abortHandler = abortHandler
        }

        this.#abortButton.classList.toggle("d-none", !abortable)

        this.#abortHandler.resetAbortController()
        this.#abortButton.disabled = false
        this.#abortButton.innerText = "Cancel"
    }

    build() {
        const dots = createElement("div", { class: "loading-dots" })
        // dots.setHTML('<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>');

        dots.innerHTML = "<div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>"

        this.#loadingText = createElement("div", {
            class: "loading-text",
            text: "Loading...",
            dataset: {
                loadingText: "",
            },
        })

        this.#loadingProgressOuter = createElement("div", {
            class: "loading-progress-outer",
            dataset: {
                loadingProgressOuter: "",
            },
        })

        this.#loadingProgressInner = createElement("div", {
            class: "loading-progress-inner",
            dataset: {
                loadingProgressInner: "",
            },
        })

        this.#loadingProgressOuter.appendChild(this.#loadingProgressInner)
        this.#loadingProgressOuter.classList.add("d-none")

        this.#abortButton = createElement("button", {
            class: "btn",
            type: "button",
            dataset: {
                abortable: "",
            },
            text: "Cancel",
        })

        this.#abortButton.classList.add("d-none")
        this.#abortButton.classList.add("danger")
        this.#abortButton.addEventListener("click", () => {
            this.#abortButton.disabled = true
            this.#abortButton.innerText = "Cancelling..."
            this.#abortHandler.abortProcessing()
        })

        this.appendChild(dots)
        this.appendChild(this.#loadingText)
        this.appendChild(this.#loadingProgressOuter)
        this.appendChild(this.#abortButton)

        this.classList.add("loading-layer")
        this.hide()
    }

    setText(text) {
        this.#loadingText.innerText = text
    }

    show(loadingText = "Loading...") {
        this.classList.add("show")
        this.setText(loadingText)
    }

    hide() {
        this.classList.remove("show")
    }

    showProgress() {
        this.#loadingProgressOuter.classList.remove("d-none")
    }

    hideProgress() {
        this.#loadingProgressOuter.classList.add("d-none")
        this.#loadingProgressInner.style.setProperty("--progress", 0)
    }

    setProgress(progress) {
        this.#loadingProgressInner.style.setProperty("--progress", progress)
        this.#loadingProgressInner.innerText = `${progress}%`
    }

    setAbortHandler(abortHandler) {
        this.#abortHandler = abortHandler
    }

    getAbortHandler() {
        return this.#abortHandler
    }

    addStyles() {
        const styles = `
            .loading-layer {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(255,255,255,.85);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 1rem;

                opacity: 0;
                pointer-events: none;
                transition: opacity 250ms ease-in-out;
            }   
                
            .loading-layer.show {
                opacity: 1;
                pointer-events: auto;
                z-index: 1;
            }
            
            .loading-layer .loading-progress-outer {
                width: 70vw;
                height: 25px;
                border-radius: 5px;
                overflow: hidden;
                border: 1px solid rgba(0, 0, 0, 0.5);
                background: rgba(0, 0, 0, 0.1);
            }   

            .loading-layer .loading-progress-inner {
                --progress: 0;
                --transition: width 350ms ease-in-out;

                width: calc(var(--progress) * 1%);
                height: 100%;
                background: #333;
                transition: var(--transition);

                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }

            .loading-text {
                color: #333;
                text-align: center;
            }
                
            /* Loader */
            .loading-dots {
                --size: 70px;
                    
                display: inline-block;
                position: relative;
                width: var(--size);
                height: var(--size);
            }   
                    
            .loading-dots div {
                position: absolute;
                width: 8px;
                height: 8px;
                background: #333;
                border-radius: 50%;
                animation: loading-dots 1.2s linear infinite;
            }       
            .loading-dots div:nth-child(1) {
                animation-delay: 0s;
                top: 37px;
                left: 66px;
            }
            .loading-dots div:nth-child(2) {
                animation-delay: -0.1s;
                top: 22px;
                left: 62px;
            }
            .loading-dots div:nth-child(3) {
                animation-delay: -0.2s;
                top: 11px;
                left: 52px;
            }
            .loading-dots div:nth-child(4) {
                animation-delay: -0.3s;
                top: 7px;
                left: 37px;
            }
            .loading-dots div:nth-child(5) {
                animation-delay: -0.4s;
                top: 11px;
                left: 22px;
            }
            .loading-dots div:nth-child(6) {
                animation-delay: -0.5s;
                top: 22px;
                left: 11px;
            }
            .loading-dots div:nth-child(7) {
                animation-delay: -0.6s;
                top: 37px;
                left: 7px;
            }
            .loading-dots div:nth-child(8) {
                animation-delay: -0.7s;
                top: 52px;
                left: 11px;
            }
            .loading-dots div:nth-child(9) {
                animation-delay: -0.8s;
                top: 62px;
                left: 22px;
            }
            .loading-dots div:nth-child(10) {
                animation-delay: -0.9s;
                top: 66px;
                left: 37px; 
            }
            .loading-dots div:nth-child(11) {
                animation-delay: -1s;
                top: 62px;
                left: 52px;
            }
            .loading-dots div:nth-child(12) {
                animation-delay: -1.1s;
                top: 52px;
                left: 62px;
            }
            @keyframes loading-dots {
                0%, 20%, 80%, 100% {
                    transform: scale(1);
                }
                50% {
                    transform: scale(1.5);
                }
            }
        `

        const customStyle = createElement("style")
        // customStyle.setHTML(styles);
        customStyle.innerHTML = styles
        this.appendChild(customStyle)
    }
}

customElements.define("loading-layer", LoadingLayer)

export default LoadingLayer
