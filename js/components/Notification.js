import { createElement } from "../utils/helper.js"

class Notification extends HTMLElement {
    #wrapperEl
    #textEl
    #closeBtn
    #closeTimeout
    #canClose

    constructor() {
        super()

        this.build()
        this.hide()
    }

    static TYPE = {
        INFO: "info",
        WARNING: "warning",
        ERROR: "danger",
        SUCCESS: "success",
    }

    build() {
        this.#wrapperEl = createElement("div", {
            class: "notification-wrapper",
            dataset: {
                notificationWrapper: "",
                type: "info",
            },
        })

        this.#textEl = createElement("p", {
            class: "notification-text",
            dataset: {
                notificationText: "",
            },
            text: "Well done! You successfullyread this important.",
        })

        this.#closeBtn = createElement("button", {
            class: "close-notification-btn",
            dataset: {
                notificationCloseBtn: "",
            },
        })

        // this.#closeBtn.setHTML('<span>&times</span>');
        this.#closeBtn.innerHTML = "<span>&times</span>"

        this.#closeBtn.addEventListener("click", this.handleCloseBtnClick.bind(this))

        this.#wrapperEl.appendChild(this.#textEl)
        this.#wrapperEl.appendChild(this.#closeBtn)

        this.appendChild(this.#wrapperEl)
        this.addStyles()

        this.canClose = true
    }

    set notificationText(value) {
        this.#textEl.innerHTML = value
    }

    set notificationType(value) {
        this.#wrapperEl.dataset.type = value
    }

    set canClose(value) {
        this.#canClose = value
        this.#wrapperEl.classList.toggle("can-close", value)
    }

    setAndShow(text, type, canClose, time = null) {
        this.notificationText = text
        this.notificationType = type
        this.canClose = canClose
        this.show(time)
    }

    infoClosable(text) {
        this.setAndShow(text, Notification.TYPE.INFO, true, null)
    }

    successClosable(text) {
        this.setAndShow(text, Notification.TYPE.SUCCESS, true, null)
    }

    warnNoClosable(text) {
        this.setAndShow(text, Notification.TYPE.WARNING, false, null)
    }

    warnClosable(text) {
        this.setAndShow(text, Notification.TYPE.WARNING, true, null)
    }

    warnClosableTimeout(text, time) {
        this.setAndShow(text, Notification.TYPE.WARNING, true, time)
    }

    errorCloseable(text) {
        this.setAndShow(text, Notification.TYPE.ERROR, true, null)
    }

    errorNoClosable(text) {
        this.setAndShow(text, Notification.TYPE.ERROR, false, null)
    }

    handleCloseBtnClick() {
        if (!this.#canClose) return

        if (this.#closeTimeout != null) {
            clearTimeout(this.#closeTimeout)
        }

        this.hide()
    }

    show(delayToHide = null) {
        this.classList.remove("d-none")

        if (delayToHide != null && Number.isInteger(delayToHide)) {
            if (this.#closeTimeout) clearTimeout(this.#closeTimeout)

            this.#closeTimeout = setTimeout(this.hide.bind(this), delayToHide)
        } else if (this.#closeTimeout != null) {
            clearTimeout(this.#closeTimeout)
        }
    }

    hide() {
        this.classList.add("d-none")
    }

    addStyles() {
        const styles = `
            .notification-wrapper {
                position: relative;
                padding: 0.5rem 0.75rem;
                border: 1px solid transparent;
                border-radius: .25rem;
            };

            .notification-wrapper:before {
                content: '';
                position: absolute;
                width: 0;
                border-left: 1px solid;
                border-right: 2px solid;
                border-bottom-right-radius: 3px;
                border-top-right-radius: 3px;
                left: 0;
                top: 50%;
                transform: translate(0,-50%);
                height: 20px;
            }

            .notification-wrapper[data-type="info"] {
                border: 1px solid rgba(6, 44, 241, 0.46);
                background-color: rgba(7, 73, 149, 0.12156862745098039);
                box-shadow: 0px 0px 2px #0396ff;
                color: #0396ff;
                transition:0.5s;
            }

            .notification-wrapper[data-type="info"]:hover {
                background-color: rgba(7, 73, 149, 0.35);
                transition: 0.5s;
            }

            .notification-wrapper[data-type="success"] {
                border: 1px solid rgba(36, 241, 6, 0.46);
                background-color: rgba(7, 149, 66, 0.12156862745098039);
                box-shadow: 0px 0px 2px #259c08;
                color: #0ad406; 
                transition: 0.5s;
            }

            .notification-wrapper[data-type="success"]:hover {
                background-color: rgba(7, 149, 66, 0.35);
                transition: 0.5s;
            }

            .notification-wrapper[data-type="warning"] {
                border: 1px solid rgba(241, 142, 6, 0.81);
                background-color: rgba(220, 128, 1, 0.16);
                box-shadow: 0px 0px 2px #ffb103;
                color: #ffb103;
                transition:0.5s;
            }   

            .notification-wrapper[data-type="warning"]:hover {
                background-color: rgba(220, 128, 1, 0.33);
                transition: 0.5s;
            }

            .notification-wrapper[data-type="danger"] {
                border: 1px solid rgba(241, 6, 6, 0.81);
                background-color: rgba(220, 17, 1, 0.16);
                box-shadow: 0px 0px 2px #ff0303;
                color: #ff0303;
                transition:0.5s;
            }
            
            .notification-wrapper[data-type="danger"]:hover {
                background-color: rgba(220, 17, 1, 0.33);
                transition: 0.5s;
            }

            .notification-wrapper:not(.can-close) .close-notification-btn {
                display: none;
            }

            .notification-wrapper.can-close {
                padding-right: 50px;
            }
            
            .notification-wrapper.can-close .close-notification-btn {
                position: absolute;
                top: 0;
                right: 0;
                max-height: 50px;
                height: 100%;
                aspect-ratio: 1 / 1;
                color: inherit;
                font-size: 18px;
                cursor: pointer;

                background-color: transparent;
                transition: background-color 250ms ease;
                border: 0;
                -webkit-appearance: none;
            }

            .notification-wrapper.can-close .close-notification-btn::before {
                display: block;
                font-size: 1.5rem;
                font-weight: 700;
                line-height: 1;
            }

            .notification-wrapper.can-close .close-notification-btn::hover {
                background-color: rgba(0, 0, 0, 0.3);
            }

            .notification-wrapper.can-close .close-notification-btn span {
                font-size: 1.5rem;
                line-height: 1;
            }

            .notification-text {
                font-size: 0.9rem;
                max-height: 100px;
                overflow-y: auto;
            }
                    
            .notification-text::-webkit-scrollbar {
                width: 7px;
            }

            .notification-text::-webkit-scrollbar-track {
                background: rgba(160, 20, 3, 0.1);
                border-radius: 25px;
            }

            .notification-text::-webkit-scrollbar-thumb {
                background: rgba(255, 3, 3, 0.7);
                border-radius: 25px;
            }

        `

        const customStyle = createElement("style")
        // customStyle.setHTML(styles);
        customStyle.innerHTML = styles
        this.appendChild(customStyle)
    }
}

customElements.define("custom-notification", Notification)
export default Notification
