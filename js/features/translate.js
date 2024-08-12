import { getArtsTagsInView, extractPrimaryTextAndSimplifyArtifactObjects } from "../utils/artifactHelper.js"
import { closeDialogWithTransition } from "../../libs/dialog-modal/script.js"
import { TRANSLATE_ATTR_NAME, LOCAL_STORAGE_KEY, STATS_WIDGET_ACTIONS } from "../config/constants.js"
import { getOrdinal, qs, saveStorage } from "../utils/helper.js"
import { translator, openAI } from "../aiInstances.js"
import renderer from "../view/Renderer.js"
import state from "../config/State.js"
import { isServiceReady, showServiceBusy } from "../service/AIs/helper.js"

const TRANSLATE_DURATION = LOCAL_STORAGE_KEY + "-translation"

let actionLogWrapper = null

async function handleTranslateSubmit(e) {
    try {
        await translate(e, { version: 1 })
    } catch (err) {
        throw err
    }
}

export async function initTranslateTool(_, globalActionLogWrapper) {
    if (actionLogWrapper == null) {
        actionLogWrapper = globalActionLogWrapper
    }

    try {
        await Promise.all([showTranslateLanguagePicker(), populateLanguages()])

        await new Promise((resolve, reject) => {
            renderer.translateLangForm.addEventListener("submit", (e) => handleTranslateSubmit(e).then(resolve).catch(reject), { once: true })
        })
    } catch (err) {
        console.error(err)
        throw err
    }
}

async function populateLanguages() {
    try {
        if (renderer.hasLanguageOptions()) return

        renderer.langSelect.classList.add("loading")

        const data = await translator.getLanguages({})
        renderer.populateLanguagesSelect(data.translation)
        renderer.langSelect.classList.remove("loading")
    } catch (err) {
        throw err
    }
}

async function showTranslateLanguagePicker() {
    try {
        if (state.component == null) {
            renderer.notification.errorClosable(`Something went wrong when we try to check/create the attribute ${TRANSLATE_ATTR_NAME}`)
            return false
        }

        renderer.showTranslateLanguageDialog()
    } catch (err) {
        throw err
    }
}

async function translate(e, { version }) {
    const { artifacts, artIdsInView } = state
    const abortHandler = renderer.loadingLayer.getAbortHandler()

    if (renderer.isDialogCancelButton(e)) {
        renderer.loadingLayer.hide()
        closeDialogWithTransition(renderer.translateLangDialog)
        return
    }

    if (artifacts == null) {
        renderer.notification.warnNoClosable("No artifacts / views retrieved!")
        renderer.loadingLayer.hide()
        return
    }

    const langCode = qs("[data-selected-value]", renderer.langSelect).dataset.selectedValue

    closeDialogWithTransition(renderer.translateLangDialog)

    if (langCode == null) {
        renderer.notification.warnNoClosable("Failed to select a language to translate to!")
        renderer.loadingLayer.hide()
        return
    }

    const arts = getArtsTagsInView({ artifacts, artIdsInView })

    // Version param in the object argument is to define which service
    // to use to translate contents
    // 1 -> Azure openAI
    // 2 -> Azure translator -> temporarily removed to make the dev of queue easier
    await executeTranslate({
        rawArtifactObjs: arts,
        translateLangCode: langCode,
        version,
    })
}

/**
 * Interact with the Translator class to translate text
 * @param {Object} options
 * @param {Object[]} options.rawArtifactObjs
 * @param {string} options.translateLangCode
 * @param {Object} options.user - User data for the server to identify the role, name and email
 * @returns {Array} - Array of artifacts that failed to be updated
 */
async function executeTranslate({ version = 2, rawArtifactObjs, translateLangCode }) {
    console.log(`Translator or OpenAI for translation: ${version === 1 ? "OpenAI" : "Translator"}`)

    switch (version) {
        case 1:
            return executeTranslateWithOpenAI({ rawArtifactObjs, translateLangCode })
        default:
            return null
    }
}

async function executeTranslateWithOpenAI({ rawArtifactObjs, translateLangCode, artsCount = rawArtifactObjs.length }) {
    const start = performance.now()
    openAI.setClient(state.client)
    const abortHandler = renderer.loadingLayer.getAbortHandler()
    
    const prompt = `Translate this content to ${translateLangCode}:`
    const role = "You are a translator!"

    try {
        if (rawArtifactObjs.length === 0) {
            renderer.notify({ title: "No artifacts", message: "No artifacts to translate!" })
            return false
        }

        const { serviceReady, message } = await isServiceReady(openAI)
        if (!serviceReady) {
            const shouldEnqueueReq = await showServiceBusy(renderer, message)
            if (!shouldEnqueueReq) return false
        }

        renderer.loadingLayer.show("Adding job to queue...")

        const {
            status,
            data: { queueLength },
        } = await openAI.subscribeRequestToServer({
            data: {
                artifacts: extractPrimaryTextAndSimplifyArtifactObjects(rawArtifactObjs),
                dngWorkspace: {
                    module: {
                        uri: state.moduleURI,
                        title: state.moduleTitle,
                        viewId: state.moduleViewId,
                    },
                    configPreset: state.configPreset,
                    rawConfigPreset: state.rawConfigPreset,
                    configURI: state.configURI,
                    changesetURL: state.changesetURL,
                    componentURL: state.component.urlInProject,
                    projectId: state.projectId,
                },
            },
            tool: "translate",
            prompt,
            role,
        })

        if (status !== "success") {
            throw new Error("Failed to add job to queue!")
        }

        const enqueuedMessage = `Translate job has been added to queue and is currently in the <strong>${getOrdinal(queueLength)}</strong> position.`
        await renderer.notify({ title: "Job added", message: enqueuedMessage })

        renderer.finishLogging()
        renderer.loadingLayer.hide()
        const duration = performance.now() - start
        saveStorage(TRANSLATE_DURATION, duration)

        // await actionLogWrapper.logAnAction(STATS_WIDGET_ACTIONS.translate.request.name, {
        //     artifactsCount: rawArtifactObjs.length,
        // })
    } catch (err) {
        throw err
    }
}
