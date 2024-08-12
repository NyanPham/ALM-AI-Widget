import { getArtsTagsInView, filterRequirementsFromArtifacts, extractPrimaryTextAndSimplifyArtifactObjects } from "../utils/artifactHelper.js"
import { getOrdinal, saveStorage } from "../utils/helper.js"
import { LOCAL_STORAGE_KEY, STATS_WIDGET_ACTIONS } from "../config/constants.js"
import { openAI } from "../aiInstances.js"
import renderer from "../view/Renderer.js"
import state from "../config/State.js"
import { isServiceReady, showServiceBusy } from "../service/AIs/helper.js"

const TOXIC_DURATION = LOCAL_STORAGE_KEY + "-toxic"
const QUALITY_DURATION = LOCAL_STORAGE_KEY + "-quality"

export async function checkSingle(prompts, { loadingText = "Loading", promptKey, actionLogWrapper }) {
    const start = performance.now()
    const { artifacts, artIdsInView, artTypesMap } = state
    const { value: prompt, role: assistantRole } = prompts.getPrompt(promptKey) // toxic | quality

    renderer.loadingLayer.show(loadingText)
    const arts = filterRequirementsFromArtifacts(getArtsTagsInView({ artifacts, artIdsInView }), artTypesMap)

    openAI.setClient(state.client)

    try {
        if (arts.length === 0) {
            renderer.notify({ title: "No requirements", message: `No requirements to check ${promptKey}` })
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
                artifacts: extractPrimaryTextAndSimplifyArtifactObjects(arts),
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
            tool: promptKey,
            prompt,
            role: assistantRole,
        })

        if (status !== "success") {
            throw new Error("Failed to add job to queue!")
        }

        const enqueuedMessage = `Checking ${promptKey} has been added to queue and is currently in the <strong>${getOrdinal(queueLength)}</strong> position.`

        let statsActionName

        switch (promptKey.toLowerCase()) {
            case "toxic": {
                statsActionName = STATS_WIDGET_ACTIONS.toxic.request.name
                break
            }
            case "quality": {
                statsActionName = STATS_WIDGET_ACTIONS.quality.request.name
                break
            }
            default:
                throw new Error(`Not valid prompt key tool! of ${promptKey}`)
        }

        await Promise.allSettled([
            renderer.notify({ title: "Job added", message: enqueuedMessage }),
            // actionLogWrapper.logAnAction(statsActionName, {
            //     artifactsCount: arts.length,
            // }),
        ])

        const duration = performance.now() - start
        console.log(duration)
        saveStorage(promptKey === "toxic" ? TOXIC_DURATION : QUALITY_DURATION, duration)
    } catch (err) {
        throw err
    } finally {
        renderer.loadingLayer.hide()
        renderer.loadingLayer.setProgress(0)
        renderer.loadingLayer.hideProgress()
        renderer.loadingLayer.toggleAbortable(null, false)
        renderer.finishLogging()
    }
}
