import { Renderer } from "../../view/Renderer.js"
import { PROD_SERVER_URL } from "./config.js"

const EXCLAIMATION_SVG = '<svg style="width: 25px; height: 25px; fill: orange;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/></svg>'

/**
 * Show the message that server is busy, asking if user wants to add request to queue to process later
 * @param {Renderer} renderer
 * @param {string} message
 */
export function showServiceBusy(renderer, message) {
    const contentEl = document.createElement("div")
    contentEl.classList.add("flex")
    contentEl.classList.add("items-center")
    contentEl.classList.add("gap-2")
    contentEl.innerHTML = EXCLAIMATION_SVG + message
    
    return new Promise(async (resolve) => {
        await renderer.setGeneralDialogContent({
            title: "Azure Service Busy",
            content: contentEl,
            submittable: true,
            submitText: "Yes",
            onSubmit: (e) => {
                renderer.endLoadingAndLogging()
                resolve(!renderer.isDialogCancelButton(e))
            },
            styles: {
                "min-height": "unset",
                "max-height": "unset",
                height: "max-content",
                "box-shadow": "none",
            },
        })
        renderer.showGeneralDialog()
    })
}

// aiInstance: Instance of AIConnect (OpenAI, Translator, DocAnalyzer)
export async function isServiceReady(aiInstance) {
    try {
        const res = await aiInstance.checkServerBusy()

        if (res.status === "success") {
            if (res.data?.blockedByStateMachine) {
                return {
                    serviceReady: false,
                    message: res.message,
                }
            }

            return {
                serviceReady: true,
            }
        }

        return {
            serviceReady: false,
            message: "Service is busy! Please try again later!",
        }
    } catch (err) {
        throw err
    }
}

/**
 * This function is to check if the connection to the backend on the VM is successfull
 * @returns {boolean}
 */
export async function testVMServerConnection() {
    try {
        const res = await fetch(PROD_SERVER_URL, {
            method: "GET",
            mode: "cors",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        })

        const data = await res.json()

        if (res.ok && data.status === "success") {
            console.log(`The server on VM is live: ${PROD_SERVER_URL}`)
            return true
        } else {
            return false
        }
    } catch (err) {
        return false
    }
}
