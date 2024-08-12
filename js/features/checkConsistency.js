import { getArtsTagsInView, filterRequirementsFromArtifacts, extractPrimaryTextAndSimplifyArtifactObjects } from "../utils/artifactHelper.js"
import { saveStorage, getOrdinal } from "../utils/helper.js"
import { LOCAL_STORAGE_KEY, STATS_WIDGET_ACTIONS } from "../config/constants.js"
import { openAI } from "../aiInstances.js"
import renderer from "../view/Renderer.js"
import state from "../config/State.js"
import { isServiceReady, showServiceBusy } from "../service/AIs/helper.js"

const CONSISTENCY_DURATION = LOCAL_STORAGE_KEY + "-consistency"

export async function checkConsistency(prompts, actionLogWrapper) {
    const start = performance.now()
    openAI.setClient(state.client)

    const { artifacts, artIdsInView, artTypesMap, user } = state

    if (artifacts == null || artTypesMap == null) {
        renderer.notification.errorCloseable("Failed to retrieve / views from the module!")
        renderer.loadingLayer.hide()
        return
    }

    renderer.loadingLayer.show("Checking consistency of the artifacts")
    const arts = getArtsTagsInView({ artifacts, artIdsInView })
    const requirements = filterRequirementsFromArtifacts(arts, artTypesMap)

    const { value: prompt, role } = prompts.getPrompt("consistency")

    renderer.loadingLayer.setProgress(0)
    renderer.loadingLayer.showProgress()
    renderer.loadingLayer.toggleAbortable(null, false)
    // renderer.prepareLogger()

    try {
        renderer.loadingLayer.show("Finding artifacts that have content potential conflicts...")
        const similarTextGroups = await findSimilarGroupsParallel({ requirements, similarityThreshold: 0.5 })

        if (similarTextGroups.length === 0) {
            renderer.notify({ title: "No similar requirements", message: "No requirements that have similar text enough to check for consistency!" })
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
                artifacts: similarTextGroups.map((group) => extractPrimaryTextAndSimplifyArtifactObjects(group)),
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
            tool: "consistency",
            prompt,
            role,
        })

        if (status !== "success") {
            throw new Error("Failed to add job to queue!")
        }

        const enqueuedMessage = `Checking Consistenct job has been added to queue and is currently in the <strong>${getOrdinal(queueLength)}</strong> position.`
        await Promise.allSettled([
            renderer.notify({ title: "Job added", message: enqueuedMessage }),
            // actionLogWrapper.logAnAction(STATS_WIDGET_ACTIONS.consistency.request.name, {
            //     artifactsCount: requirements.length,
            // })
        ])

        const duration = performance.now() - start
        console.log(duration)
        saveStorage(CONSISTENCY_DURATION, duration)
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

async function findSimilarGroupsParallel({ requirements, similarityThreshold = 0.5 }) {
    const start = performance.now()

    const groups = new Map() // Use a Map to store groups
    const artifactsByWords = new Map() // Store artifacts by words
    requirements.forEach((art) => {
        artifactsByWords.set(art.id, new Set(art?.primaryText?.split(" ") || ""))
    })

    const artsCount = requirements.length
    const WORKERS_MAX = navigator?.hardwareConcurrency ? navigator.hardwareConcurrency * 7 : 12
    const CONCUR_MAX = 200

    let workers = []
    let concurArts = []

    // Handle messages from Web Workers
    const handleWorkerMessage = (event) => {
        const { type, data } = event.data

        if (type === "result") {
            const { workerGroups } = data

            if (workerGroups.length > 0) {
                workerGroups.forEach((group) => {
                    if (groups.has(group[0])) {
                        console.log("Exists")
                    }

                    groups.set(group[0], group[1])
                })
            }
        }
    }

    for (let i = 0; i < artsCount; i++) {
        // Create a Web Worker for each artifact
        const currentArt = requirements[i]
        const remainingArts = requirements.slice(i + 1)

        if (concurArts.length < CONCUR_MAX) {
            concurArts.push({
                currentArt,
                remainingArts,
            })
        }

        if (workers.length < WORKERS_MAX && (concurArts.length >= CONCUR_MAX || i === artsCount - 1)) {
            const worker = new Worker("./js/workers/jaccard.worker.js")
            worker.postMessage({ type: "initialize", concurArts, artifactsByWords })

            workers.push(worker)
            concurArts = []
        }

        if (workers.length >= WORKERS_MAX || i === artsCount - 1) {
            workers.forEach((worker) => {
                worker.addEventListener("message", handleWorkerMessage)
            })

            workers.forEach((worker) => {
                worker.postMessage({ type: "start", similarityThreshold })
            })

            await Promise.allSettled(workers.map((worker) => new Promise((resolve) => worker.addEventListener("message", resolve))))
            workers.forEach((worker) => worker.terminate())
            workers = []
        }

        const progress = ((i / artsCount) * 100).toFixed(2)
        renderer.updateProgress(progress)
    }
    console.log(`parallel: ${performance.now() - start}`)

    return Array.from(groups.values())
}
