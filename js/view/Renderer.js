import { Notification, LoadingLayer, ArtifactsImportPreview, CustomModal, ListWithPagination } from "../components/index.js"
import { getById, qsa, qs, setStyleProperty, clearContent, hideEl, showEl, createElement, toggleEl, humanizeDate, getStyleProperty, generateUUID, slugify } from "../utils/helper.js"
import { handleDialogHeadingMouseDown, handleDialogHeadingMouseUp, handleMouseMove, showDialogWithTransition, closeDialogWithTransition, waitForDialogReady } from "../../libs/dialog-modal/script.js"
import { EVENT_LOG_TYPE, NO_VIEW_STRING } from "../config/constants.js"

// Render Layer
export class Renderer {
    constructor(widgetDoc) {
        this.widgetDoc = widgetDoc

        this.mainEl = getById("main")
        this.preconditionMessageEl = getById("precondition-message")
        this.moduleTitleEl = qs("[data-module-title]", widgetDoc)

        this.langSelect = getById("translate-lang")
        this.translateLangDialog = getById("translate-lang-select-dialog")
        this.translateLangForm = qs('[data-dialog-form="translate-lang"]', this.translateLangDialog)

        this.dialogHeadings = qsa("[data-dialog-heading]", widgetDoc)
        this.dialogForms = qsa("[data-dialog-form]", widgetDoc)

        this.generalDialog = getById("multi-purpose-dialog")
        this.generalDialogForm = qs('[data-dialog-form="multi-purpose"]', this.generalDialog)

        this.eventLoggerDialog = getById("event-logger-dialog")
        this.eventLogForm = qs("[data-dialog-form]", this.eventLoggerDialog)
        this.showLogBtn = getById("show-log-btn")
        this.eventLogProgress = qs("[data-event-log-progress-bar]", this.eventLoggerDialog)
        this.eventLogProgressText = qs("[data-event-progress-text]", this.eventLoggerDialog)
        this.eventLogger = qs("[data-logger]", this.eventLoggerDialog)
        this.fixedShowLogBtn = getById("fixed-show-log-btn")
        this.exportLogBtn = qs("[data-export-log-btn]", this.eventLoggerDialog)

        this.exportFileNameInput = qs("[data-export-name-input]", this.eventLoggerDialog)
        this.eventLogProgressText = qs("[data-event-progress-text]", this.eventLoggerDialog)
        this.fileNameInput = qs("[data-export-name-input] input", this.eventLogForm)
        this.eventLogRadicalProgress = qs("[data-event-log-radical-progress]", this.eventLoggerDialog)

        this.backgroundLayer = qs("[data-background-layer]", widgetDoc)

        this.viewSelect = getById("view-select")

        // Inputs for AI: ETM Component and Interface Spec Module
        this.etmAndInterfaceDialog = getById("etm-component-interface-module-dialog")
        this.etmComponentSelect = getById("etm-component-select")
        this.etmStreamSelect = getById("etm-stream-select")
        this.etmAndInterfaceForm = qs('[data-dialog-form="etm-component-interface-module-form"]', this.etmAndInterfaceDialog)
        this.browseInterfaceModuleBtn = qs('[data-browse-module-btn="interface"]', this.etmAndInterfaceDialog)
        this.browseModuleBtns = qsa("[data-browse-module-btn]", this.etmAndInterfaceDialog)
        this.moduleInterFace = qs('[data-module="interface"]', this.etmAndInterfaceDialog)
        this.etmAndInterFaceFormError = qs("[data-form-error]", this.etmAndInterfaceDialog)
        this.etmAndInterfaceSubmitBtn = qs("[data-submit-btn]", this.etmAndInterfaceDialog)

        // Queue
        this.getOpenAIQueueBtn = qs('[data-get-queue-btn="open-ai"]', widgetDoc)
        this.serverQueueBtnText = qs("[data-server-queue-text]", widgetDoc)
        this.serverQueuesDialog = getById("server-queues-dialog")
        this.serverQueuesFilterBtn = qs("[data-filter-queues-btn]", this.serverQueuesDialog)

        // Request Results
        this.requestResultDialog = getById("request-results-dialog")
        this.getUserFinishedReqsBtn = qs("[data-get-user-finised-req-btn]", widgetDoc)
        this.requestResultFilterBtn = qs("[data-filter-results-btn]", this.requestResultDialog)

        // Slideup Popup
        this.slideupPopupTemplate = qs("[data-slideup-popup-template]")
    }

    initSingletonElements() {
        this.notification = new Notification()
        this.loadingLayer = new LoadingLayer()
    }

    appendSingletoneElements(notiWrapper = getById("notification-wrapper"), parent = document) {
        notiWrapper.appendChild(this.notification)
        parent.body.appendChild(this.loadingLayer)
    }

    initModalDrag() {
        this.dialogHeadings.forEach((dialog) => {
            dialog.addEventListener("mousedown", handleDialogHeadingMouseDown)
            dialog.addEventListener("mouseup", handleDialogHeadingMouseUp)
        })

        this.widgetDoc.addEventListener("mousemove", handleMouseMove)
    }

    initCommonDialogEvents() {
        this.dialogForms.forEach((dialogForm) => {
            dialogForm.addEventListener("submit", (e) => {
                e.preventDefault()
            })
        })
        ;[this.generalDialogForm, this.eventLogForm].forEach((form) =>
            form.addEventListener("submit", (e) => {
                const dialog = e.target.closest("[data-dialog]")
                closeDialogWithTransition(dialog)
            })
        )
    }

    updateProgress(progress) {
        this.loadingLayer.setProgress(progress)
        this.updateEventProgress(progress)
    }

    addContentToLog(message, type) {
        if (this.showLogBtn.disabled) {
            this.showLogBtn.disabled = false
        }

        if (this.eventLogger == null) return null

        const el = createElement("div", { class: "log-item", dataset: { type } })
        el.innerHTML = `<em>${new Date().toLocaleString()}</em>: ${message}`
        this.eventLogger.appendChild(el)
    }

    getQueuesFilterParams() {
        const queuesFilter = qs("[data-server-queues-filter]", this.serverQueuesDialog)
        const toolFilterValue = qs("#tool-filter-select [data-selected-value]", queuesFilter)?.dataset.selectedValue
        const forUserOnly = qs("#for-user-only", queuesFilter)?.checked

        return [toolFilterValue, forUserOnly]
    }

    getResultsFilterParams() {
        const resultsFilter = qs("[data-results-filter]", this.requestResultDialog)
        const toolFilterValue = qs("#tool-filter-result-select [data-selected-value]", resultsFilter)?.dataset.selectedValue
        return toolFilterValue
    }

    updateEventProgress(progress) {
        let bgColor
        if (progress < 25) bgColor = "var(--danger-btn-background)"
        else if (progress >= 25 && progress < 50) bgColor = "var(--warning-btn-background)"
        else if (progress >= 50 && progress < 75) bgColor = "var(--primary-btn-background)"
        else bgColor = "var(--success-btn-background)"

        setStyleProperty(this.eventLogProgress, "--width", progress)
        setStyleProperty(this.eventLogProgress, "--event-progress-color", bgColor)

        this.eventLogRadicalProgress.dataset.eventLogProgress = `${progress.split(".")[0]}%`
        setStyleProperty(this.eventLogRadicalProgress, "--progress", progress)
        setStyleProperty(this.eventLogRadicalProgress, "--event-progress-color", bgColor)
    }

    resetLogger() {
        if (this.eventLogger == null) return
        clearContent(this.eventLogger)

        this.showLogBtn.disabled = true
        hideEl(this.exportLogBtn)
        hideEl(this.exportFileNameInput)
    }

    prepareLogger() {
        this.resetLogger()
        showEl(this.fixedShowLogBtn)
        showEl(this.eventLogProgressText)
        showEl(this.eventLogRadicalProgress)
    }

    finishLogging() {
        showEl(this.exportLogBtn)
        showEl(this.exportFileNameInput)
        hideEl(this.fixedShowLogBtn)
        hideEl(this.eventLogProgressText)
        hideEl(this.eventLogRadicalProgress)
    }

    logError(message) {
        this.addContentToLog(message, EVENT_LOG_TYPE.ERROR)
    }

    logSuccess(message) {
        this.addContentToLog(message, EVENT_LOG_TYPE.SUCCESS)
    }

    setModuleTitle(title) {
        this.moduleTitleEl.innerText = title
    }

    getModuleTitle() {
        return this.moduleTitleEl.innerText
    }

    passPreconditions() {
        showEl(this.mainEl)
        hideEl(this.preconditionMessageEl)
        const sidePanel = qs(".side-panel", this.widgetDoc)

        if (sidePanel) sidePanel.classList.remove("d-none")

        const bottomAILogo = qs("#ai-solution-logo", this.widgetDoc)
        if (bottomAILogo) showEl(bottomAILogo)
    }

    failPreconditions(errors) {
        const messageEl = qs("[data-msg]", this.preconditionMessageEl)
        messageEl.innerText = errors[0].text
        messageEl.style.display = null

        hideEl(this.mainEl)
        showEl(this.preconditionMessageEl)

        if (this.loadingLayer) {
            this.loadingLayer.hide()
            this.loadingLayer.setProgress(0)
        }

        const sidePanel = qs(".side-panel", this.widgetDoc)
        if (sidePanel) sidePanel.classList.add("d-none")

        errors.forEach(({ type, text, resizeWidget = false }) => {
            if (resizeWidget) {
                this.resizeWidgetHeight()
            }
        })

        const bottomAILogo = qs("#ai-solution-logo", this.widgetDoc)
        if (bottomAILogo) hideEl(bottomAILogo)
    }

    resizeWidgetHeight(size = null) {
        const dashboardIframe = window.frameElement
        dashboardIframe.style.height = size ? `${size}px` : "auto"

        const bottomAILogo = qs("#ai-solution-logo", this.widgetDoc)
        if (bottomAILogo) setStyleProperty(bottomAILogo, "--bottom", "-0.5rem")
    }

    // Module Views
    buildModuleViewSelect(views) {
        const selectDropdown = qs("[data-select-dropdown]", this.viewSelect)
        clearContent(selectDropdown)

        const viewOptions = views.map((view) => ({
            text: view.title,
            value: view.id.split("/").at(-1),
            name: view.id,
        }))

        viewOptions.unshift({
            text: "All module artifacts",
            value: NO_VIEW_STRING,
            name: NO_VIEW_STRING,
        })

        viewOptions.forEach((viewOption) => {
            const li = createElement("li", {
                role: "option",
                dataset: {
                    selectOption: viewOption.value,
                },
            })

            const input = createElement("input", {
                type: "radio",
                name: "module-view",
                id: viewOption.value,
                value: viewOption.value,
            })

            if (viewOption.value === NO_VIEW_STRING) {
                input.checked = true
            }

            const label = createElement("label", {
                for: viewOption.value,
                text: viewOption.text,
            })

            li.appendChild(input)
            li.appendChild(label)
            selectDropdown.appendChild(li)
        })
    }

    // Miscalleanous
    scrollToTop(window) {
        const dashboardIframe = window.frameElement
        const widgetContainer = dashboardIframe.closest(".jazz-ensemble-internal-WidgetContainer")

        const scroll = () => {
            widgetContainer.scrollIntoView({ block: "start", behavior: "smooth" })
        }

        if (widgetContainer == null) return scroll()

        const widgetScrollView = widgetContainer.closest(".jazz-ui-ScrollableView")
        if (widgetScrollView == null) return scroll()

        const scrollbar = widgetScrollView.querySelector(".scrollbar")
        if (scrollbar == null) return scroll()

        const onScrollEnd = (e) => {
            scrollbar.click()
        }

        widgetContainer.addEventListener("scrollend", onScrollEnd, { once: true })
        scroll()
    }

    async showArtsDataForPreview(artsData) {
        const artsPreviewEl = new ArtifactsImportPreview(artsData, "Artifacts preview to import")
        ArtifactsImportPreview.buildHtml(artsPreviewEl)
        ArtifactsImportPreview.buildStyles(artsPreviewEl)
        ArtifactsImportPreview.buildContent(artsPreviewEl)

        const submitHandler = () => {
            return ArtifactsImportPreview.getResults(artsPreviewEl)
        }

        const docClickHandler = (e, modalSubmitBtn) => {
            const isPreviewField = e.target.matches("artifacts-preview") || e.target.closest("artifacts-preview") != null
            const isCheckAll = e.target.matches(".preview-title") || e.target.closest(".preview-title") != null

            if (!isPreviewField && !isCheckAll) {
                return
            }

            modalSubmitBtn.disabled = ArtifactsImportPreview.getResults(artsPreviewEl).length === 0
        }

        const artsPicker = new CustomModal("Select changes", artsPreviewEl, parent.document.body, {}, submitHandler, docClickHandler)
        const pickedData = await artsPicker.build({ disableSubmit: true })

        return pickedData
    }

    static hasCustomSelectOptions(customSelect) {
        const selectDropdown = qs("[data-select-dropdown]", customSelect)
        return qs("[data-select-option]", selectDropdown) != null
    }

    hasETMComponentSelectOptions() {
        return Renderer.hasCustomSelectOptions(this.etmComponentSelect)
    }

    populateETMComponentSelectOptions(componentOptions) {
        const selectDropdown = qs("[data-select-dropdown]", this.etmComponentSelect)
        clearContent(selectDropdown)

        componentOptions.forEach(({ text, name, value, id, etmStreamsData }) => {
            const li = createElement("li", {
                role: "option",
                dataset: {
                    selectOption: value,
                    etmStreamsData: JSON.stringify(etmStreamsData),
                },
            })

            const input = createElement("input", {
                type: "radio",
                name: "etm-component-option",
                id: id,
                value,
            })

            const label = createElement("label", {
                for: id,
                text: text,
            })

            li.appendChild(input)
            li.appendChild(label)
            selectDropdown.appendChild(li)
        })
    }

    populateETMStreamSelectOptions(streamOptions) {
        const selectButton = qs("[data-selected-value]", this.etmStreamSelect)
        selectButton.dataset.selectedValue = ""
        selectButton.innerText = "Open this to select a stream"

        const selectDropdown = qs("[data-select-dropdown]", this.etmStreamSelect)
        clearContent(selectDropdown)

        streamOptions.forEach(({ text, value, id, streamData }) => {
            const li = createElement("li", {
                role: "option",
                dataset: {
                    selectOption: value,
                    streamData: JSON.stringify(streamData),
                },
            })

            const input = createElement("input", {
                type: "radio",
                name: "etm-stream-option",
                id: id,
                value,
            })

            const label = createElement("label", {
                for: id,
                text: text,
            })

            li.appendChild(input)
            li.appendChild(label)
            selectDropdown.appendChild(li)
        })
    }

    populateLanguagesSelect(languages) {
        const selectDropdown = qs("[data-select-dropdown]", this.langSelect)
        clearContent(selectDropdown)

        Object.entries(languages).forEach(([code, lang]) => {
            const li = createElement("li", {
                role: "option",
                dataset: {
                    selectOption: code,
                },
            })

            const input = createElement("input", {
                type: "radio",
                name: "module-view",
                id: code,
                value: code,
            })

            const label = createElement("label", {
                for: code,
                text: lang.nativeName,
            })

            li.appendChild(input)
            li.appendChild(label)
            selectDropdown.appendChild(li)
        })
    }

    hasLanguageOptions() {
        return Renderer.hasCustomSelectOptions(this.langSelect)
    }

    waitForDialogToClose(dialogModal) {
        if (dialogModal.open && dialogModal.classList.contains("close")) {
            return Promise.resolve
        }

        const closeTransitionTime = getStyleProperty(dialogModal, "--transition-duration") || 1000

        return new Promise((resolve) => {
            setTimeout(() => {
                resolve()
            }, closeTransitionTime)
        })
    }

    async setGeneralDialogContent({ title = "", content = "", submitText = null, onSubmit = null, submittable = false, hideCancelBtn = false, styles = null }) {
        await waitForDialogReady(this.generalDialog)

        const titleEl = qs("[data-title]", this.generalDialog)
        const submitBtn = qs("[data-submit-btn]", this.generalDialog)
        const contentEl = qs("[data-content]", this.generalDialog)
        const generalDialogForm = qs('[data-dialog-form="multi-purpose"]', this.generalDialog)
        const footer = qs("[data-form-footer]", this.generalDialog)
        const cancelBtn = qs("[data-cancel-btn]", footer)

        cancelBtn.classList.toggle("hide", hideCancelBtn)

        if (title) {
            titleEl.textContent = title
        }

        if (submittable) {
            submitBtn.disabled = false
            showEl(submitBtn)
        } else {
            submitBtn.disabled = true
            hideEl(submitBtn)
        }

        if (submitText) {
            submitBtn.innerText = submitText
        }

        if (submittable && typeof onSubmit === "function") {
            generalDialogForm.addEventListener("submit", onSubmit, { once: true })
        }

        if (styles != null) {
            Object.entries(styles).forEach(([key, value]) => (contentEl.style[key] = value))
        } else {
            contentEl.style = null
        }

        clearContent(contentEl)
        if (content) {
            if (typeof content === "string") contentEl.textContent = content
            else contentEl.appendChild(content)
        }
    }

    isDialogCancelButton(e) {
        return e.submitter.matches("[data-cancel-btn]")
    }

    showGeneralDialog() {
        showDialogWithTransition(this.generalDialog)
    }

    showServerQueuesDialog() {
        showDialogWithTransition(this.serverQueuesDialog)
    }

    renderFilteredQueueData(queue, { state = "idle", repaintAll = false }) {
        const queueBody = qs("[data-queues-body]", this.serverQueuesDialog)
        if (queue == null || repaintAll) {
            clearContent(queueBody)
        } else {
            const queueDataMap = queue.reduce((dataMap, item) => {
                return {
                    ...dataMap,
                    [item.sessionId]: item,
                }
            }, {})

            qsa("[data-queue-item]", queueBody).forEach((queueItem) => {
                const sessionId = queueItem.dataset.sessionId
                if (!queueDataMap[sessionId]) queueItem.remove()
            })

            qsa("[data-no-queue-display]", queueBody).forEach((noQueueDisplay) => noQueueDisplay.remove())
        }

        if (state === "loading") {
            const loadingEl = createElement("p", { dataset: { noQueueDisplay: true } })
            loadingEl.innerText = "Loading queues..."
            loadingEl.style.padding = "0.5rem 0.75rem"
            queueBody.appendChild(loadingEl)

            return
        }

        if (state === "removing") {
            const removingEl = createElement("p", { dataset: { noQueueDisplay: true } })
            removingEl.innerText = "Removing item from queue..."
            removingEl.style.padding = "0.5rem 0.75rem"
            queueBody.appendChild(removingEl)

            return
        }

        if (queue == null) {
            throw new Error("Queue data not found!")
        }

        if (queue.length === 0) {
            const noServiceEl = createElement("p", { dataset: { noQueueDisplay: true } })
            noServiceEl.innerText = "No service requests found in queue!"
            noServiceEl.style.padding = "0.5rem 0.75rem"
            queueBody.appendChild(noServiceEl)

            return
        }

        const userClientId = Renderer.getClientID(this.widgetDoc.parent.document)

        queue.forEach(({ artifactCount, requestedAt, tool, sessionId, clientId, dngWorkspace, status, progress }) => {
            let itemLi = qs(`[data-session-id="${sessionId}"][data-client-id="${clientId}"]`, queueBody)

            if (itemLi == null) {
                itemLi = createElement("li", { class: "queue-item", dataset: { queueItem: true, sessionId, clientId, status, progress } })
                queueBody.appendChild(itemLi)

                const toolNameEl = createElement("span", { class: "mr-1", text: tool.split("-").join(" ") })
                const artsTotalEl = createElement("span", { class: "mr-1", text: artifactCount })
                const requestedAtEl = createElement("span", { text: humanizeDate(requestedAt) })
                itemLi.appendChild(toolNameEl)
                itemLi.appendChild(artsTotalEl)
                itemLi.appendChild(requestedAtEl)

                if (userClientId === clientId) {
                    const cancelBtn = createElement("button", { type: "button", class: "remove-queue-item", dataset: { removeFromQueueBtn: true, sessionId, tool } })
                    cancelBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M367.2 412.5L99.5 144.8C77.1 176.1 64 214.5 64 256c0 106 86 192 192 192c41.5 0 79.9-13.1 111.2-35.5zm45.3-45.3C434.9 335.9 448 297.5 448 256c0-106-86-192-192-192c-41.5 0-79.9 13.1-111.2 35.5L412.5 367.2zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z"/></svg>'
                    itemLi.appendChild(cancelBtn)
                }
            }

            itemLi.dataset.status = status
            itemLi.dataset.progress = progress
            if (status === "running") {
                setStyleProperty(itemLi, "--progress", progress)
            }
        })
    }   

    static getClientID(parentDocument) {
        const bannerEl = qs('[dojoattachpoint="_banner"]', parentDocument.body)
        const userNameEl = qs(".user-name", bannerEl)
        const name = userNameEl.textContent.trim()
        return name ? slugify(name) : null
    }

    updateProgressInQueue(runningItems) {
        const queueBody = qs("[data-queues-body]", this.serverQueuesDialog)

        runningItems.forEach(({ sessionId, clientId, status, progress }) => {
            const itemLi = qs(`[data-session-id="${sessionId}"][data-client-id="${clientId}"]`, queueBody)
            if (itemLi == null) return
            itemLi.dataset.progress = progress
            setStyleProperty(itemLi, "--progress", progress)
        })
    }

    closeServerQueuesDialog() {
        closeDialogWithTransition(this.serverQueuesDialog)
    }

    closeGeneralDialog() {
        closeDialogWithTransition(this.generalDialog)
    }

    showEventLoggerDialog() {
        showDialogWithTransition(this.eventLoggerDialog)
    }

    closeEventLoggerDialog() {
        closeDialogWithTransition(this.eventLoggerDialog)
    }

    showEtmCompAndIntfModDialog() {
        showDialogWithTransition(this.etmAndInterfaceDialog)
    }

    closeEtmCompAndIntfModDialog() {
        closeDialogWithTransition(this.etmAndInterfaceDialog)
    }

    showTranslateLanguageDialog() {
        showDialogWithTransition(this.translateLangDialog)
    }

    showRequestResultsDialog() {
        showDialogWithTransition(this.requestResultDialog)
    }

    closeRequestResultsDialog() {
        closeDialogWithTransition(this.requestResultDialog)
    }

    populateRequestResults(data, { state = "idle" }) {
        const multipleSelect = qs("[data-multiple-select]", this.requestResultDialog)
        const submitBtn = qs("[data-submit-btn]", this.requestResultDialog)
        submitBtn.disabled = true
        clearContent(multipleSelect)

        if (state === "loading") {
            const loadingEl = createElement("p")
            loadingEl.innerText = "Loading results..."
            multipleSelect.appendChild(loadingEl)

            return
        }

        if (data.length === 0) {
            const noResultEl = createElement("p")
            noResultEl.innerText = "No results found!"
            multipleSelect.appendChild(noResultEl)

            return
        }

        data.forEach(({ tool, dngWorkspace: { module }, requestedAt, data, errors, sessionId }, index) => {
            let results
            let hasResults = false
            let checkBoxText = "Update"

            switch (tool) {
                case "translate":
                case "quality":
                case "toxic": {
                    results = data.map(({ artId, message }) => `<strong>${artId}</strong>: <br/> ${message.replaceAll("\n", "<br />")}`)
                    hasResults = results.length > 0
                    break
                }

                case "consistency": {
                    results = data.consistencyIssues
                    hasResults = results.length > 0
                    checkBoxText = "Export CSV"
                    break
                }

                case "test-cases-generation": {
                    results = data
                    hasResults = results.testCasesOfRequirements?.length > 0
                    break
                }

                default:
                    console.error("Invalid tool!")
                    return
            }

            const resultHeader = this.buildResultHeaderHTML(multipleSelect, sessionId, index, module.title, { hasResults, checkBoxText })
            const { resultBody: resultsWrapper, containerId, dataRows } = this.buildResultsListHTML(results, errors)

            const summary = createElement("summary", { text: `${tool.split("-").join(" ")} (${new Date(requestedAt).toDateString()})` })
            const details = createElement("details")
            details.appendChild(summary)
            multipleSelect.appendChild(details)

            // These 2 divs serve the animation of the accordion
            const div1 = createElement("div")
            const div2 = createElement("div")
            div1.appendChild(div2)

            div2.appendChild(resultHeader)
            div2.appendChild(resultsWrapper)

            details.appendChild(div1)

            // List with Pagination
            new ListWithPagination(dataRows, containerId)
        })
    }

    setTestCaseToolPrompts({ prompt, assistantRole, promptStrict, assistantRoleStrict }) {
        this.etmAndInterfaceDialog.dataset.prompt = prompt
        this.etmAndInterfaceDialog.dataset.assistantRole = assistantRole
        this.etmAndInterfaceDialog.dataset.promptStrict = promptStrict
        this.etmAndInterfaceDialog.dataset.assistantRoleStrict = assistantRoleStrict
    }

    getTestCaseToolPrompts() {
        return {
            prompt: this.etmAndInterfaceDialog.dataset.prompt,
            assistantRole: this.etmAndInterfaceDialog.dataset.assistantRole,
            promptStrict: this.etmAndInterfaceDialog.dataset.promptStrict,
            assistantRoleStrict: this.etmAndInterfaceDialog.dataset.assistantRoleStrict,
        }
    }

    buildResultHeaderHTML(multipleSelect, sessionId, index, moduleTitle, { hasResults, checkBoxText }) {
        const [updateLabel, updateCheckbox] = createCheckbox(sessionId, checkBoxText, { index, sessionId, type: "update" })
        const [removeLabel, removeCheckbox] = createCheckbox(sessionId, "Remove", { index, sessionId, type: "remove" })
        updateCheckbox.disabled = !hasResults

        const updateWrapper = createElement("div")
        updateWrapper.appendChild(updateCheckbox)
        updateWrapper.appendChild(updateLabel)

        const removeWrapper = createElement("div")
        removeWrapper.appendChild(removeCheckbox)
        removeWrapper.appendChild(removeLabel)

        const actionWrapper = createElement("div", { class: "actions-wrapper" })
        actionWrapper.appendChild(updateWrapper)
        actionWrapper.appendChild(removeWrapper)

        const moduleTitleEl = createElement("h4", { class: "result-header--module-title", text: `Module: ${moduleTitle}` })

        const resultHeader = createElement("div", { class: "result-header" })
        resultHeader.appendChild(moduleTitleEl)
        resultHeader.appendChild(actionWrapper)

        const checkFormSubmittable = () => {
            const inputs = qsa("input", multipleSelect)
            const submitBtn = qs("[data-submit-btn]", this.requestResultDialog)
            submitBtn.disabled = !inputs.some((input) => input.checked)
        }

        updateCheckbox.addEventListener("change", () => {
            if (removeCheckbox.checked) removeCheckbox.checked = false
            checkFormSubmittable()
        })

        removeCheckbox.addEventListener("change", () => {
            if (updateCheckbox.checked) updateCheckbox.checked = false
            checkFormSubmittable()
        })

        return resultHeader
    }

    buildErrorDataRows(errors) {
        const errorRows = []

        if (errors?.length > 0) {
            errors.forEach((error) => {
                errorRows.push(this.buildResultListItem(error, { classes: ["warning-list-item"] }))
            })
        }

        return errorRows
    }

    buildResultListItem(result, { classes = [] } = {}) {
        if (typeof result !== "string") return null

        const listItem = createElement("li")
        classes.forEach((c) => listItem.classList.add(c))
        listItem.innerHTML = result.replaceAll("<br/>", "\n")

        return listItem
    }

    buildResultDataRows(results) {
        const dataRows = []

        if (Array.isArray(results)) {
            results.forEach((resultString) => {
                dataRows.push(this.buildResultListItem(resultString))
            })
        } else if (typeof results === "object") {
            const { testCasesOfRequirements } = results
            testCasesOfRequirements.forEach(({ requirementData, testCasesToGenerate }) => {
                if (requirementData == null) return null

                const resultString = `
                        Requirement <strong>${requirementData.id}</strong>
                            <br />
                            <h4>Test cases to create:</h4>  
                            <ul>
                                ${
                                    testCasesToGenerate?.length > 0
                                        ? testCasesToGenerate
                                              .map(({ title, description, testCaseDesign }) => {
                                                  return `<li>
                                            Title: ${title}
                                            <br><br>
                                            Description: ${description}
                                            <br><br> 
                                            Design: ${JSON.stringify(testCaseDesign, null, 2)}
                                        </li>`
                                              })
                                              .join("")
                                        : "<li>No test cases</li>"
                                }
                            </ul>`
                dataRows.push(this.buildResultListItem(resultString))
            })
        }

        return dataRows
    }

    buildResultsListHTML(results, errors) {
        const randomID = generateUUID()
        const containerId = `container-${randomID}`

        const resultBody = createElement("div", { class: "result-body", id: containerId })

        const dataRows = results == null || (Array.isArray(results) && results.length === 0) ? [createElement("li", { text: "No results to show!" })] : this.buildResultDataRows(results)
        const errorRows = this.buildErrorDataRows(errors)

        return { resultBody, containerId, dataRows: [...errorRows, ...dataRows].filter((item) => item != null) }
    }

    hideLoadingAndProgress() {
        this.loadingLayer.hideProgress()
        this.loadingLayer.setProgress(0)
        this.loadingLayer.hide()
    }

    startLoadingAndLogging() {}

    endLoadingAndLogging() {
        renderer.loadingLayer.hide()
        renderer.loadingLayer.setProgress(0)
        renderer.loadingLayer.hideProgress()
        renderer.finishLogging()
    }

    createSlideupPopup({ content, confirmText, cancelText, onConfirm, onCancel }) {
        const slideupPopupWrapper = this.slideupPopupTemplate.content.cloneNode(true)
        const slideupPopup = slideupPopupWrapper.firstElementChild
        const contentEl = qs("[data-content]", slideupPopup)
        const confirmBtn = qs('[data-btn="confirm"]', slideupPopup)
        const cancelBtn = qs('[data-btn="cancel"]', slideupPopup)

        contentEl.innerHTML = content
        confirmBtn.textContent = confirmText
        cancelBtn.textContent = cancelText
        
        confirmBtn.addEventListener("click", () => {
            onConfirm()
            this.clearSlideupPopup(slideupPopup)
        })

        cancelBtn.addEventListener("click", () => {
            onCancel()
            this.clearSlideupPopup(slideupPopup)
        })

        this.widgetDoc.body.appendChild(slideupPopup)

        let startTime

        const animate = (timeStamp) => {
            if (startTime == null) {
                startTime = timeStamp
                return requestAnimationFrame(animate)
            }

            const elapsed = timeStamp - startTime

            if (elapsed < 100) {
                requestAnimationFrame(animate)
                return
            }

            slideupPopup.classList.add("show")
        }

        requestAnimationFrame(animate)
    }

    clearSlideupPopup(popup = null) {
        const onTransitionEnd = (e) => {
            if (e.target.dataset.slideupPopup == null) return
            if (e.target.classList.contains("show")) return
            
            e.target.remove()
        }

        if (popup?.dataset.slideupPopup) {
            popup.addEventListener("transitionend", onTransitionEnd)
            return popup.classList.remove("show")
        }

        const slideupPopups = qsa("[data-slideup-popup]", this.widgetDoc)

        slideupPopups.forEach((el) => {
            el.addEventListener("transitionend", onTransitionEnd)
            el.classList.remove("show")
        })
    }

    async notify({ title = "Notification", message }) {
        const defaultContentStyles = {
            "min-height": "unset",
            "max-height": "unset",
            height: "max-content",
            "box-shadow": "none",
        }

        const contentEl = createElement("div")
        contentEl.innerHTML = message

        await this.setGeneralDialogContent({
            title,
            content: contentEl,
            submittable: true,
            submitText: "OK",
            hideCancelBtn: true,
            styles: defaultContentStyles,
        })
        this.showGeneralDialog()
    }
}

function createCheckbox(sessionId, text, dataset) {
    const label = createElement("label", { for: `${text}_${sessionId}`, class: "checkbox-label", text })
    const checkmark = createElement("div", { class: "checkmark" })
    label.appendChild(checkmark)
    const input = createElement("input", { type: "checkbox", class: "checkbox-input", id: `${text}_${sessionId}`, dataset })

    return [label, input]
}

const renderer = new Renderer(document)

export default renderer
