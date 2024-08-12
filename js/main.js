import { state, hostContext, location, isModule, getProjectId, getURIs, isDNGApplication, isValidConfigurationAndChangeset } from "./config/index.js"
import { qs, qsa, getById, exportFile, debounce, generateUUID, createElement, splitPromiseSettledResponses } from "./utils/helper.js"
import { Prompts, fetchArtIdsInView, getModuleBasicInfo, getViewURIs, queryModuleArtifacts, processCurrentComponentPage, processConfigAndChangeset, updateSelectedResultsToDNG } from "./service/index.js"
import { Component } from "./models/index.js"
import { NO_VIEW_STRING, LOCAL_STORAGE_CLIENT_ID_KEY, PRECONDITION_MESSAGES, STATS_WIDGET_ACTIONS } from "./config/constants.js"
import renderer, { Renderer } from "./view/Renderer.js"
import AbortHandler from "./utils/AbortHandler.js"
import { checkConsistency, checkToxic, checkQuality, initTranslateTool, showEtmCompIntfModPicker } from "./features/index.js"
import { PROD_SERVER_URL } from "./service/AIs/index.js"
import { fetchItemsInBatches, getFetchErrorMessage } from "./utils/fetchHelper.js"
import { buildArtifactTypeMapByResources, extractPrimaryTextAndSimplifyArtifactObjects } from "./utils/artifactHelper.js"
import { openAI } from "./aiInstances.js"
import { getAIInstanceFromTool, TOOL_NAMES } from "./utils/getAIInstanceFromTool.js"
import initCollapseWhenHeaderClick from "./utils/initCollapseWhenHeaderClick.js"
import { confirmWithDialog } from "./utils/modalHelper.js"
import { getStatsAction } from "./utils/toolHelper.js"
import ActionLogWrapper from "../libs/actionLogWrapper.js"

// DOM Traversal
const toolBtns = qsa("[data-ai-tool-btn]")
const translateLangDialog = getById("translate-lang-select-dialog")
const langSelect = getById("translate-lang")
const viewSelect = getById("view-select")
const eventLoggerDialog = getById("event-logger-dialog")
const eventLogForm = qs("[data-dialog-form]", eventLoggerDialog)
const showLogBtn = getById("show-log-btn")
const fixedShowLogBtn = getById("fixed-show-log-btn")
const exportLogBtn = qs("[data-export-log-btn]", eventLoggerDialog)
const fileNameInput = qs("[data-export-name-input] input", eventLogForm)

// Prompt Config
const prompts = new Prompts(PROD_SERVER_URL, "api/v1/prompts")

// Service filter based on the clicked button
const TOOL_DISPATCHER = new Map([
    ["translate", initTranslateTool],
    ["consistency", checkConsistency],
    ["toxic", checkToxic],
    ["quality", checkQuality],
    ["test-case", showEtmCompIntfModPicker],
])

// Cache
const CachedViewsData = new Map()

// Singleton custom elements
const abortHandler = new AbortHandler()

// Widget Statistics
const actionLogWrapper = new ActionLogWrapper("ALM AI", STATS_WIDGET_ACTIONS)

parent.addEventListener("hashchange", async () => {
    reset()

    const errors = await checkPreconditions()

    if (errors.length > 0) {
        renderer.failPreconditions(errors)
        return false
    }

    renderer.passPreconditions()
    init()
})

window.addEventListener("load", async () => {
    const widgetEnv = window.frameElement.src.includes("alm-ai--updating") ? "Updating" : "Main"
    console.warn(widgetEnv)

    initCollapseWhenHeaderClick()
    initDetailsSummaryAnimation()

    renderer.initSingletonElements()
    renderer.appendSingletoneElements()
    renderer.initModalDrag()
    renderer.initCommonDialogEvents()

    toolBtns.forEach((btn) => btn.addEventListener("click", handleToolBtnClick))

    viewSelect.addEventListener("change", handleViewChosen)
    langSelect.addEventListener("change", (e) => {
        qs("[data-submit-btn]", translateLangDialog).disabled = false
    })

    showLogBtn.addEventListener("click", renderer.showEventLoggerDialog.bind(renderer))
    fixedShowLogBtn.addEventListener("click", renderer.showEventLoggerDialog.bind(renderer))
    eventLogForm.addEventListener("submit", handleExportLog)
    fileNameInput.addEventListener("input", handleFileNameInput)

    consoleLogger.disableLogger()
    const [preconditionsRes, _] = await Promise.allSettled([checkPreconditions(), actionLogWrapper.initActionLog()])
    consoleLogger.enableLogger()

    const errors = preconditionsRes.value

    if (errors.length > 0) {
        renderer.failPreconditions(errors)
        return false
    }

    renderer.passPreconditions()
    init()
})

function handleToolBtnClick(e) {
    let button

    if (e.target.matches("[data-ai-tool-btn]")) {
        button = e.target
    } else if (e.target.closest("[data-ai-tool-btn]") != null) {
        button = e.target.closest("[data-ai-tool-btn]")
    }

    if (button == null) {
        renderer.notification.errorCloseable("Oops! Something went wrong. Please try again!")
        return false
    }

    if (button.dataset.tool == null) return false
    if (state.artifacts == null || state.artifacts.length === 0) {
        renderer.notification.warnNoClosable("No artifacts found in the opened module.")
        return false
    }

    renderer.loadingLayer.show()

    const toolName = button.dataset.tool.trim().toLowerCase()
    const handler = TOOL_DISPATCHER.get(toolName)
    if (handler == null) return

    renderer.scrollToTop(window)
    renderer.loadingLayer.setAbortHandler(abortHandler)
    renderer.loadingLayer.toggleAbortable(abortHandler, false)

    handler(prompts, actionLogWrapper).catch((err) => {
        console.error(err)

        renderer.notify({ title: "Service Error", message: getFetchErrorMessage(err) })

        // ERROR: Out of memory:
        /*
        1: Failed to subscribe to database due to the RAM
            DONE: Finished Result can be JSON file. 
            -> Some part of te queue can be in JSON file.
        2: Too many artifacts to process on the browser  
            -> Alert of using a view.
        */

        renderer.loadingLayer.hide()
        renderer.loadingLayer.setProgress(0)
        renderer.loadingLayer.hideProgress()
        renderer.loadingLayer.toggleAbortable(abortHandler, false)
        renderer.finishLogging()
    })
}

// function getClientID() {
//     const bannerEl = qs('[dojoattachpoint="_banner"]', parent.document.body)
//     const userNameEl = qs(".user-name", bannerEl)
//     const name = userNameEl.textContent.trim()
//     return name ? slugify(name) : null
// }

function initDetailsSummaryAnimation() {
    document.addEventListener("click", (e) => {
        let summaryElement

        if (e.target.matches("summary")) {
            summaryElement = e.target
        } else if (e.target.closest("summary") != null) {
            summaryElement = e.target.closest("summary")
        }

        if (summaryElement == null) return

        const detailsElement = summaryElement.parentElement
        const contentElement = summaryElement.nextElementSibling

        if (contentElement.classList.contains("animation")) {
            contentElement.classList.remove("animation", "collapsing")
            return
        }

        const onAnimationEnd = (cb) => contentElement.addEventListener("animationend", cb, { once: true })

        requestAnimationFrame(() => contentElement.classList.add("animation"))
        onAnimationEnd(() => contentElement.classList.remove("animation"))

        const isDetailsOpen = detailsElement.getAttribute("open") !== null
        if (isDetailsOpen) {
            // prevent default collapsing and delay it until the animation has completed
            e.preventDefault()
            contentElement.classList.add("collapsing")
            onAnimationEnd(() => {
                detailsElement.removeAttribute("open")
                contentElement.classList.remove("collapsing")
            })
        } else {
            detailsElement.scrollIntoView({ block: "start", behavior: "smooth" })
        }
    })
}

async function init() {
    renderer.loadingLayer.show("Loading module meta data...")
    state.client = { clientId: Renderer.getClientID(parent.document) }
    openAI.setClient(state.client)

    console.log(state.client.clientId) // 81c54eb9-57bb-45fc-9757-7ae6ac1efafa

    const projectId = getProjectId(location.hash, location.href)

    const { moduleURI, configURI, componentURI, configPreset, changeset, rawConfigPreset } = getURIs(location.hash)
    state.moduleURI = moduleURI
    state.projectId = projectId
    state.configPreset = configPreset
    state.rawConfigPreset = rawConfigPreset
    state.configURI = configURI

    const [{ title, moduleTypeName }, views, component, { changesetURL }] = await Promise.all([
        getModuleBasicInfo(hostContext, moduleURI, configURI, configPreset, projectId),
        getViewURIs({
            hostContext: hostContext,
            moduleURI: moduleURI,
            configURI: configURI,
            configPreset: configPreset,
            componentURI: componentURI,
            projectId: projectId,
        }),
        processCurrentComponentPage(componentURI),
        processConfigAndChangeset({ hostContext, changesetURL: changeset, componentURI, configURL: configURI, projectId }),
    ])

    state.changesetURL = changesetURL

    renderer.buildModuleViewSelect(views)
    renderer.setModuleTitle(title)

    state.moduleTitle = title

    const { isValidSpace, spaceErrors } = isValidConfigurationAndChangeset({
        checkConfig: false,
        checkChangeset: true,
        changesetURL,
    })

    if (!isValidSpace) {
        const message = spaceErrors.join("\n")
        renderer.notification.warnNoClosable(message)
        renderer.loadingLayer.hide()
        renderer.loadingLayer.setProgress(0)

        return
    }

    renderer.notification.hide()

    toolBtns.forEach((btn) => (btn.disabled = false))

    const config = {
        configType: "Changeset",
        name: "",
        url: changesetURL,
    }

    state.component = new Component(component, config, hostContext)
    renderer.loadingLayer.show("Loading module artifacts data...")

    const [queryFilteredRes, _] = await Promise.allSettled([
        queryModuleArtifacts({
            hostContext,
            moduleURI: state.moduleURI,
            componentUrlInProject: state.component.urlInProject,
            configURI: state.configURI,
        }),
        state.component.fetchComponentObjectType(),
    ])

    const queryFilteredData = queryFilteredRes?.status === "fulfilled" ? queryFilteredRes.value : null

    if (queryFilteredData == null || queryFilteredData.length === 0) {
        renderer.notification.warnNoClosable(`No artifacts found`)
        renderer.loadingLayer.hide()
        renderer.loadingLayer.setProgress(0)
        return
    }

    const artTypesMap = buildArtifactTypeMapByResources(state.component.xml)

    state.artifacts = queryFilteredData
    state.artTypesMap = artTypesMap

    if (queryFilteredData.length === 0) {
        renderer.notification.warnNoClosable("No artifacts found")
        renderer.loadingLayer.hide()
        renderer.loadingLayer.setProgress(0)
        return
    }

    const handleServerQueuesClick = toggleServerQueues()

    renderer.getOpenAIQueueBtn.addEventListener("click", handleServerQueuesClick)
    qs("[data-cancel-btn]", renderer.serverQueuesDialog).addEventListener("click", handleServerQueuesClick)
    renderer.serverQueuesFilterBtn.addEventListener("click", handleServerFilterBtnClick)
    renderer.getUserFinishedReqsBtn.addEventListener("click", queryAndShowFinishedRequests)
    renderer.requestResultFilterBtn.addEventListener("click", handleResultFilterBtnClick)

    const result = await openAI.queryFinishedRequests({})

    if (result?.data?.length > 0) {
        renderer.notify({ title: "Results are ready", message: "Some of your tool requests have finished. Please click finished requests below to check!" })
    }

    renderer.createSlideupPopup({
        content: `<p>Are you about to use the test case generation? If yes, we would like to collect the data in the background to improve the test case gen speed.</p>`,
        confirmText: "Sure",
        cancelText: "Nope!",
        onConfirm: () =>
            handleSendDataToPreprocess({
                dngWorkspace: {
                    module: {
                        uri: state.moduleURI,
                    },
                    projectId: state.projectId,
                },
                allArtifacts: state.artifacts,
            }),
        onCancel: () => {},
    })

    document.addEventListener("click", handleRemoveFromQueue)
    renderer.loadingLayer.hide()
    renderer.loadingLayer.setProgress(0)
}

function reset() {
    renderer.setModuleTitle("")
    state.reset()
    toolBtns.forEach((btn) => (btn.disabled = true))

    const viewSelect = qs("[data-custom-select]")
    const noViewOption = qs('[data-select-option="no-view"]', viewSelect)

    if (noViewOption) {
        qs("input", noViewOption).click()
    }
}

const handleViewChosen = debounce(async () => {
    const viewId = qs("[data-selected-value]", viewSelect).dataset.selectedValue
    state.moduleViewId = viewId

    if (viewId === NO_VIEW_STRING) {
        state.artIdsInView = null

        return
    }

    let artifactIds

    if (CachedViewsData.get(viewId) != null) {
        artifactIds = CachedViewsData.get(viewId)
    } else {
        renderer.loadingLayer.show("Loading artifacts in selected view...")

        artifactIds = await fetchArtIdsInView({ hostContext, currentViewURI: viewId, ...state })
        CachedViewsData.set(viewId, artifactIds.slice(0))
    }

    state.artIdsInView = artifactIds

    requestAnimationFrame(() => {
        renderer.loadingLayer.hide()
        renderer.loadingLayer.setProgress(0)
    })
}, 250)

// Logger
function handleExportLog(e) {
    if (renderer.isDialogCancelButton(e) || fileNameInput.value.trim() === "") return

    const content = [...qs("[data-logger]", eventLogForm).children]
        .map((logItem) => {
            const type = logItem.dataset.type

            return `${type}: ${logItem.innerText}\n`
        })
        .join("")

    exportFile(content, "text/plain", fileNameInput.value.trim())
}

function handleFileNameInput(e) {
    exportLogBtn.disabled = e.target.value == null || e.target.value.trim() === ""
}

async function checkPreconditions() {
    const errors = []

    try {
        if (!isDNGApplication()) {
            errors.push(PRECONDITION_MESSAGES.requireDngApp)
        }

        if (!isModule()) {
            errors.push(PRECONDITION_MESSAGES.requireModule)
        }

        const isServerConnected = await prompts.getPrompts()

        if (!isServerConnected) {
            errors.push(PRECONDITION_MESSAGES.serverConnectError)
        }

        if (!prompts.hasPromptsData()) {
            errors.push(PRECONDITION_MESSAGES.promptsConfigError)
        }
    } catch (err) {
        console.error(err)
        errors.push(err.message === "Failed to fetch" ? PRECONDITION_MESSAGES.serverConnectError : { text: err.message, type: "error" })
    } finally {
        return errors
    }
}

async function queryPendingQueue(aiInstance, { toolFilterValue, forUserOnly, forProgress }) {
    try {
        const res = await aiInstance.queryPendingQueue({
            tool: toolFilterValue === TOOL_NAMES.all ? null : toolFilterValue,
            clientId: forUserOnly ? state.client.clientId : null,
            forProgress,
        })

        if (res.status !== "success") {
            throw new Error(res.message)
        }

        return res.data.queue
    } catch (err) {
        throw err
    }
}

async function queryServiceFinishedResults(aiInstance, { toolFilterValue }) {
    try {
        const res = await aiInstance.queryFinishedRequests({
            tool: toolFilterValue === TOOL_NAMES.all ? null : toolFilterValue,
        })

        if (res.status !== "success") {
            throw new Error(res.message)
        }

        return res.data
    } catch (err) {
        throw err
    }
}

async function queryPendingQueues(aiInstances, { toolFilterValue, forUserOnly, forProgress }) {
    try {
        const responses = await Promise.allSettled(aiInstances.map((aiInstance) => queryPendingQueue(aiInstance, { toolFilterValue, forUserOnly, forProgress })))
        return splitPromiseSettledResponses(responses)
    } catch (err) {
        throw err
    }
}

async function queryFinishedResults(aiInstances, { toolFilterValue }) {
    try {
        const responses = await Promise.allSettled(aiInstances.map((aiInstance) => queryServiceFinishedResults(aiInstance, { toolFilterValue })))
        return splitPromiseSettledResponses(responses)
    } catch (err) {
        throw err
    }
}

function getAIInstancesFromFilter(toolFilterValue, openAI, ...otherInstances) {
    if (toolFilterValue === TOOL_NAMES.all) {
        // TODO: Add more available services of AI Instances here
        return [openAI, ...otherInstances]
    }

    const aiInstance = getAIInstanceFromTool(toolFilterValue)
    return [aiInstance]
}

function getFilterOptionsAndQueryQueues() {
    let toolFilterValue
    let forUserOnly

    return async ({ toggleButton = true, syncFilterOptions = true, forProgress = false } = {}) => {
        if (syncFilterOptions) {
            ;[toolFilterValue, forUserOnly] = renderer.getQueuesFilterParams()
        }

        const aiInstances = getAIInstancesFromFilter(toolFilterValue, openAI)
        if (aiInstances.length === 0) return

        if (toggleButton) {
            renderer.serverQueuesFilterBtn.disabled = true
        }

        try {
            return await queryPendingQueues(aiInstances, { toolFilterValue, forUserOnly, forProgress })
        } catch (err) {
            console.error(err)
            throw err
        } finally {
            renderer.serverQueuesFilterBtn.disabled = false
        }
    }
}

function getFilterOptionsAndQueryResults() {
    return async () => {
        const toolFilterValue = renderer.getResultsFilterParams()

        const aiInstances = getAIInstancesFromFilter(toolFilterValue, openAI)
        if (aiInstances.length === 0) return

        try {
            return await queryFinishedResults(aiInstances, { toolFilterValue })
        } catch (err) {
            console.error(err)
            throw err
        } finally {
            renderer.requestResultFilterBtn.disabled = false
        }
    }
}

const applyServerQueuesFilter = getFilterOptionsAndQueryQueues()

async function handleServerFilterBtnClick() {
    try {
        renderer.renderFilteredQueueData(null, { state: "loading", repaintAll: true })
        const [successList, failList] = await applyServerQueuesFilter({ toggleButton: true, syncFilterOptions: true, forProgress: false })
        const queues = successList.flatMap((item) => item)
        renderer.renderFilteredQueueData(queues, { state: "idle", repaintAll: true })
    } catch (err) {
        console.error(err)
        renderer.notify({ title: "Filter Error", message: err.message })
    }
}

const applyResultsFilter = getFilterOptionsAndQueryResults()

async function handleResultFilterBtnClick() {
    try {
        renderer.populateRequestResults(null, { state: "loading" })
        const [successList, failList] = await applyResultsFilter()
        const resultsData = successList.flatMap((item) => item).filter((item) => item != null)
        renderer.populateRequestResults(resultsData, { state: "idle" })
    } catch (err) {
        console.error(err)
        renderer.notify({ title: "Filter Error", message: err.message })
    }
}

function toggleServerQueues() {
    let queuePollinInterval
    let progressPollingInterval

    const QUEUE_POLLING_INTERVAL_TIME = 10000 // 10s
    const PROGRESS_POLLING_INTERVAL_TIME = 1000 // 1s

    return async () => {
        try {
            if (renderer.serverQueuesDialog.classList.contains("show")) {
                if (queuePollinInterval != null) {
                    clearInterval(queuePollinInterval)
                }

                if (progressPollingInterval != null) {
                    clearInterval(progressPollingInterval)
                }

                renderer.closeServerQueuesDialog()
            } else {
                renderer.showServerQueuesDialog()
                renderer.renderFilteredQueueData(null, { state: "loading" })
                const [successList, failList] = await applyServerQueuesFilter({ toggleButton: true, syncFilterOptions: true, forProgress: false })
                const queueItems = successList.flatMap((item) => item)
                renderer.renderFilteredQueueData(queueItems, { state: "idle" })

                queuePollinInterval = setInterval(async () => {
                    const [successList, failList] = await applyServerQueuesFilter({ toggleButton: false, syncFilterOptions: false, forProgress: false })
                    const queueItems = successList.flatMap((item) => item)
                    renderer.renderFilteredQueueData(queueItems, { state: "idle" })
                }, QUEUE_POLLING_INTERVAL_TIME)

                progressPollingInterval = setInterval(async () => {
                    const [successList, failList] = await applyServerQueuesFilter({ toggleButton: false, syncFilterOptions: false, forProgress: true })
                    const queueRunningItems = successList.flatMap((item) => item)
                    renderer.updateProgressInQueue(queueRunningItems)
                }, PROGRESS_POLLING_INTERVAL_TIME)
            }
        } catch (err) {
            console.error(err)
            renderer.notify({ title: "Queue Polling Error", message: err.message })
            if (queuePollinInterval) {
                clearInterval(queuePollinInterval)
            }
        }
    }
}

async function queryAndShowFinishedRequests() {
    renderer.loadingLayer.show("Loading your finished requests...")
    const [successList, failList] = await applyResultsFilter()
    const resultsData = successList.flatMap((item) => item).filter((item) => item != null)
    renderer.loadingLayer.hide()

    showFinishedRequests(resultsData)
}

async function showFinishedRequests(resultsData) {
    renderer.populateRequestResults(resultsData, { state: "idle" })
    renderer.showRequestResultsDialog()

    const handleUpdateOrRemoveSelectedResults = async (resultsData) => {
        const inputs = qsa("[data-multiple-select] input", renderer.requestResultDialog)
        const selectedInputs = inputs.filter((input) => input.checked)
        const { resultsToUpdate, resultsToRemove } = selectedInputs.reduce(
            (grouped, input) => {
                const selectedResult = resultsData.find((pendingData) => pendingData.sessionId === input.dataset.sessionId)

                if (input.dataset.type === "update") {
                    return {
                        ...grouped,
                        resultsToUpdate: [...grouped.resultsToUpdate, selectedResult],
                    }
                }

                return {
                    ...grouped,
                    resultsToRemove: [...grouped.resultsToRemove, selectedResult],
                }
            },
            {
                resultsToUpdate: [],
                resultsToRemove: [],
            }
        )

        if (resultsToUpdate.length === 0 && resultsToRemove.length === 0) return

        const shouldProceed = await confirmWithDialog({ title: "Update Confirm", text: `Are you sure to update ${resultsToUpdate.length} sessions and remove ${resultsToRemove.length} sessions from storage?`, confirmText: "Proceed" })

        if (!shouldProceed) return

        const messages = []

        if (resultsToUpdate.length) {
            const { status, message, messages: resMessaegs } = await updateSelectedResultsToDNG(resultsToUpdate, hostContext, actionLogWrapper)
            switch (status) {
                case "success": {
                    messages.push(message)
                    messages.push(...resMessaegs)
                    break
                }

                case "partial-success": {
                    messages.push(message)
                    messages.push(...resMessaegs)
                    break
                }

                default: {
                    messages.push("Oops! Something went wrong!")
                }
            }
        }

        if (resultsToRemove.length) {
            const { status, message, error } = await removeResultsFromFinished(resultsToRemove)
            switch (status) {
                case "success": {
                    messages.push(message)
                    break
                }

                case "partial-success": {
                    messages.push(message)
                    break
                }

                case "fail": {
                    messages.push(error)
                    break
                }

                default: {
                    messages.push("Oops! Something went wrong!")
                    console.error(status)
                    console.error(message)
                    console.error(error)
                }
            }
        }

        renderer.notify({ title: "Update Result", message: messages.join("<br/>") })
    }

    renderer.requestResultDialog.addEventListener(
        "submit",
        async (e) => {
            renderer.closeRequestResultsDialog()
            if (renderer.isDialogCancelButton(e)) return

            await handleUpdateOrRemoveSelectedResults(resultsData)
        },
        { once: true }
    )
}

async function removeResultsFromFinished(resultsToRemove) {
    renderer.loadingLayer.show("Removing finished requests...")

    const promiseHandler = async ({ tool, sessionId }) => {
        try {
            const aiInstance = getAIInstanceFromTool(tool)
            await aiInstance.removeFinishedRequest(sessionId)
            // await actionLogWrapper.logAnAction(getStatsAction(tool, "remove")?.name, {})
        } catch (err) {
            console.error(err)
            renderer.notify({ title: "Error", message: err.message })
        }
    }

    const progressHandler = ({}) => {}
    await fetchItemsInBatches(resultsToRemove, 5, promiseHandler, progressHandler, null)
    renderer.loadingLayer.hide()

    return {
        status: "success",
        message: `Sessions' results are removed from storage!`,
    }
}

async function handleRemoveFromQueue(e) {
    let removeQueueButton

    const removeFromQueueBtnSelector = "[data-remove-from-queue-btn]"

    if (e.target.matches(removeFromQueueBtnSelector)) {
        removeQueueButton = e.target
    } else if (e.target.closest(removeFromQueueBtnSelector) != null) {
        removeQueueButton = e.target.closest(removeFromQueueBtnSelector)
    }

    if (removeQueueButton == null) return

    const shouldRemove = await confirmWithDialog({ title: "Remove Confirm", text: "Are you sure to remove the item from queue?" })
    if (!shouldRemove) return

    removeQueueButton.disabed = true
    renderer.renderFilteredQueueData(null, { state: "removing" })

    try {
        const { sessionId, tool } = removeQueueButton.dataset
        const aiInstance = getAIInstanceFromTool(tool)
        await aiInstance.cancelPendingQueueItem({ sessionId })

        const [successList, failList] = await applyServerQueuesFilter({ toggleButton: true, syncFilterOptions: true, forProgress: false })
        const queues = successList.flatMap((item) => item)
        renderer.renderFilteredQueueData(queues, { state: "idle" })
    } catch (err) {
        console.error(err)
        renderer.notify({ title: "Error", message: err.message })
    }
}

// Preprocess artifacts in module at startup
function handleSendDataToPreprocess({ dngWorkspace, allArtifacts }) {
    return openAI.preprocessForTestCasesGeneration({
        dngWorkspace,
        allArtifacts: extractPrimaryTextAndSimplifyArtifactObjects(allArtifacts, { getTestLevel: false }),
    })
}
