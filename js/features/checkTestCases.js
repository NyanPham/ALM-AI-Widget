import state, { hostContext } from "../config/State.js"
import { getArtsTagsInView, filterRequirementsFromArtifacts, extractPrimaryTextAndSimplifyArtifactObjects } from "../utils/artifactHelper.js"
import { getTag, getTags, qs, saveStorage, toXml, csmaker, exportFile, createElement, hideEl, showEl, xmlSerializer, qsa, getOrdinal } from "../utils/helper.js"
import { company_RM_ATTR_TYPE_URIS, BOUND_ARTIFACT_OBJ, LOCAL_STORAGE_KEY, IBM_XML_TAG_NAMES, IBM_XML_TAG_ATTRS, STATS_WIDGET_ACTIONS } from "../config/constants.js"
import { isValidConfigurationAndChangeset, fetchSharedStreamsData, fetchGlobalConfigurationData, fetchReduceComponentsFromStreams, fetchStreamWithComponentsFromShared } from "../config/configSpace.js"
import { fetchTestCasesAndStreamDataFromComponent, getTCCategoriesData } from "../service/etmService.js"
import { browseModule, getModuleBasicInfo } from "../service/module.js"
import { openAI } from "../aiInstances.js"
import { isServiceReady, showServiceBusy } from "../service/AIs/helper.js"
import renderer from "../view/Renderer.js"
import { confirmWithDialog } from "../utils/modalHelper.js"
import { H_TESTLEVEL_BY_ART_TYPE_NAME_MAP, H_TESTLEVEL_BY_ART_TYPE_URI_MAP, getH_TestLevelCategories } from "../service/testcases.js"

const CHECK_TEST_CASES = LOCAL_STORAGE_KEY + "-testcases"

const AI_WIDGET_TESTLEVEL_TAG_NAME = "custom:test_level"

window.addEventListener("load", () => {
    renderer.etmComponentSelect.addEventListener("change", handleSelectEtmComponent)
    renderer.etmStreamSelect.addEventListener("change", handleSelectEtmStream)

    renderer.etmAndInterfaceForm.addEventListener("submit", (e) => {
        processInputsAndProceedCaseGeneration(e)
    })
})

function handleSelectEtmStream() {
    const etmStream = qs("[data-selected-value]", renderer.etmStreamSelect)?.dataset.selectedValue
    const selectDropdown = qs("[data-select-dropdown]", renderer.etmStreamSelect)
    const option = qsa("[data-select-option]", selectDropdown).find((option) => option.dataset.selectOption === etmStream)

    toggleInputsForAIFormsButton()
}

function handleSelectEtmComponent() {
    const etmComponent = qs("[data-selected-value]", renderer.etmComponentSelect)?.dataset.selectedValue
    const selectDropdown = qs("[data-select-dropdown]", renderer.etmComponentSelect)
    const option = qsa("[data-select-option]", selectDropdown).find((option) => option.dataset.selectOption === etmComponent)
    if (option == null) {
        alert("Something went wrong when select an ETM component.")
        throw new Error("Something went wrong when select an ETM component.")
    }

    const etmStreamsData = JSON.parse(option.dataset.etmStreamsData)
    renderer.populateETMStreamSelectOptions(
        etmStreamsData.map((streamData) => ({
            text: streamData.title,
            name: streamData.title,
            value: streamData.fullStreamUrl,
            id: streamData.url,
            streamData,
        }))
    )

    renderer.etmStreamSelect.dataset.disabled = false
    renderer.etmStreamSelect.classList.remove("loading")
    toggleInputsForAIFormsButton()
}

function toggleInputsForAIFormsButton() {
    const etmComponent = qs("[data-selected-value]", renderer.etmComponentSelect)?.dataset.selectedValue
    const etmStream = qs("[data-selected-value]", renderer.etmStreamSelect)?.dataset.selectedValue

    renderer.etmAndInterfaceSubmitBtn.disabled = etmComponent == null || etmComponent === "" || etmStream == null || etmStream === ""
}

/**
 *
 * @param {string} configPreset
 * @param {string} configURI
 * @param {string} changesetURL
 * @returns
 */
export async function fetchETMComponentsInGlobal(configPreset, configURI, changesetURL) {
    const { isValidSpace, spaceErrors } = isValidConfigurationAndChangeset({
        checkConfig: true,
        checkChangeset: true,
        configPreset,
        configURI,
        changesetURL,
    })

    if (!isValidSpace) {
        const message = spaceErrors.join("\n")
        renderer.notification.warnNoClosable(message, 30000)

        alert(message)
        return
    }

    renderer.loadingLayer.hide()
    renderer.loadingLayer.show("Loading ETM components...")

    try {
        const globalConfigData = await fetchGlobalConfigurationData(configURI, changesetURL)

        if (globalConfigData == null) {
            renderer.notification.warnClosable("No global config data found! Besure the project is in the right configuration. Please try again!")
            renderer.hideLoadingAndProgress()
            return
        }

        const sharedStreams = await fetchSharedStreamsData(globalConfigData)

        if (sharedStreams == null) {
            renderer.notification.warnClosable("No streams found for the current project! Besure the project is in the right configuration. Please try again!")
            renderer.hideLoadingAndProgress()
            return
        }

        const { authRequired, data } = await fetchStreamWithComponentsFromShared(sharedStreams)

        if (authRequired == null && data == null) {
            renderer.hideLoadingAndProgress()
            return
        }

        if (authRequired) {
            const customElId = new Date().toISOString()
            const message = `You have not logged in to QM projects, login <a href="${data}" target="_blank" id=${customElId}>here</a> and press Browse again!`

            return {
                status: "unauthenticated",
                message,
            }
        }

        const componentsData = await fetchReduceComponentsFromStreams(data)

        if (componentsData == null) {
            renderer.hideLoadingAndProgress()
            return
        }

        renderer.notification.hide()

        const componentOptions = Object.entries(componentsData).map(([componentUrl, componentData]) => {
            const etmStreamsData = componentData.streamXmls.map((streamXml) => ({
                url: getTag(IBM_XML_TAG_NAMES.rdfDescription, streamXml)?.getAttribute(IBM_XML_TAG_ATTRS.about).split("/").at(-1),
                title: getTag(IBM_XML_TAG_NAMES.dctermsTitle, streamXml)?.textContent,
                fullStreamUrl: getTag(IBM_XML_TAG_NAMES.rdfDescription, streamXml)?.getAttribute(IBM_XML_TAG_ATTRS.about),
            }))

            return {
                name: componentUrl,
                id: componentUrl,
                value: componentUrl,
                text: componentData.title,
                etmStreamsData,
            }
        })

        return { componentOptions, componentsData }
    } catch (err) {
        throw err
    }
}

export async function processInputsAndProceedCaseGeneration(e) {
    renderer.closeEtmCompAndIntfModDialog()

    if (renderer.isDialogCancelButton(e)) {
        renderer.loadingLayer.hide()
        return
    }

    const etmComponentURL = qs("[data-selected-value]", renderer.etmComponentSelect).dataset.selectedValue
    const etmStreamURL = qs("[data-selected-value]", renderer.etmStreamSelect)?.dataset.selectedValue
    // const interfaceModuleURL = qs("[data-module-uri]", renderer.etmAndInterfaceDialog).dataset.moduleUri
    // const selectDropdown = qs("[data-select-dropdown]", renderer.etmStreamSelect)
    // const option = qsa("[data-select-option]", selectDropdown).find(option => option.dataset.selectOption === etmStreamURL)

    await checkTestCases({ etmComponentURL, etmStreamURL, component: state.component })
}

async function fetchETMComponentsInPicker({ configPreset, configURI, changesetURL }) {
    try {
        renderer.etmComponentSelect.classList.add("loading")
        const result = await fetchETMComponentsInGlobal(configPreset, configURI, changesetURL)

        if (result == null) {
            return {
                status: "fail",
                data: {
                    message: "Failed to get available ETM components! Please try again later...",
                },
            }
        }

        if (result.status === "unauthenticated") {
            return {
                status: "fail",
                data: {
                    message: result.message,
                },
            }
        }

        const { componentOptions, componentsData } = result

        if (componentOptions == null || componentOptions.length === 0) {
            return {
                status: "fail",
                data: {
                    message: "No ETM components to choose",
                },
            }
        }

        return {
            status: "success",
            data: {
                componentsData,
                componentOptions,
            },
        }
    } catch (err) {
        throw err
    } finally {
        renderer.etmComponentSelect.classList.remove("loading")
    }
}

export async function showEtmCompIntfModPicker(prompts) {
    const { configPreset, configURI, changesetURL } = state
    const { value: prompt, role: assistantRole } = prompts.getPrompt("test-case")
    const { value: promptStrict, role: assistantRoleStrict } = prompts.getPrompt("test-case-strict")

    renderer.setTestCaseToolPrompts({ prompt, assistantRole, promptStrict, assistantRoleStrict })

    try {
        renderer.showEtmCompAndIntfModDialog()

        if (!renderer.hasETMComponentSelectOptions() || !state.componentsData) {
            const { status, data } = await fetchETMComponentsInPicker({ configPreset, configURI, changesetURL })

            if (status === "fail") {
                renderer.notification.warnClosableTimeout(data.message)

                return false
            }

            const { componentsData, componentOptions } = data

            state.componentsData = componentsData
            renderer.populateETMComponentSelectOptions(componentOptions)
        }
    } catch (err) {
        console.error(err)
        renderer.notification.errorCloseable(err.message)
        renderer.hideLoadingAndProgress()
    }
}

async function prepareInputDataForAIs({ selectedComponent, etmStreamsData, existingTestCases }) {
    try {
        const etmProjectId = selectedComponent?.projectArea?.split("/").at(-1)
        const etmHostContext = selectedComponent?.projectArea?.split("/process/project-areas/")[0]
        const etmStreamUrl = etmStreamsData[0]?.url

        const categoriesData = await getTCCategoriesData({ etmProjectId, etmHostContext, etmStreamUrl })
        const [H_TestLevelId, H_TestLevelCategories] = getH_TestLevelCategories(categoriesData)

        const H_TestLevelByArtURILookup = Object.fromEntries(H_TESTLEVEL_BY_ART_TYPE_URI_MAP.entries())
        const H_TestLevelByArtNameLookup = Object.fromEntries(H_TESTLEVEL_BY_ART_TYPE_NAME_MAP.entries())

        const testLevelsData = {
            H_TestLevelByArtURILookup,
            H_TestLevelByArtNameLookup,
            H_TestLevelId,
        }

        const commonEtmTCEnvVariables = {
            etmProjectId,
            etmStreamUrl,
            etmHostContext,
        }

        const xmlDoc = document.implementation.createDocument(null, "books")

        return {
            existingTestCases: existingTestCases.map((tcXml) => {
                const categoryChildren = [...tcXml.children].filter((child) => child.tagName.startsWith("rqm_qm:category"))

                categoryChildren.forEach((child) => {
                    if (child.tagName.endsWith(H_TestLevelId)) {
                        const tcTestLevelId = child.getAttribute("rdf:resource")?.split("/").at(-1)?.split(":").at(-1)?.replace("#", "")
                        const tcTestLevel = H_TestLevelCategories.find((cate) => cate.itemId === tcTestLevelId)
                        const tcTestLevelTag = xmlDoc.createElement(AI_WIDGET_TESTLEVEL_TAG_NAME)

                        Object.entries(tcTestLevel).forEach(([key, value]) => {
                            tcTestLevelTag.setAttribute(key, value)
                        })

                        tcXml.appendChild(tcTestLevelTag)

                        return
                    }

                    child.remove()
                })

                return xmlSerializer.serializeToString(tcXml)
            }),
            commonEtmTCEnvVariables,
            testLevelsData,
        }
    } catch (err) {
        throw err
    }
}

function filterInvalidatedRequirements(requirements, testCases) {
    const validatedRequirementUrls = testCases.reduce((validatedMapObj, xml) => {
        const validateRequirementUrls = getTags(IBM_XML_TAG_NAMES.testCase.validateReq, xml)?.map((vr) => vr.getAttribute(IBM_XML_TAG_ATTRS.resource))

        if (validateRequirementUrls == null || validateRequirementUrls.length === 0) {
            return validatedMapObj
        }

        const updatedMapObj = { ...validatedMapObj }
        validateRequirementUrls.forEach((url) => {
            updatedMapObj[url] = true
        })

        return updatedMapObj
    }, {})

    return requirements.reduce((invalidatedList, req) => {
        if (validatedRequirementUrls[req.uri] === true) return invalidatedList

        return [...invalidatedList, req]
    }, [])
}

function getFunctionalClassificationUris() {
    const attrDef = state.component.selfTypesLookupTableByOwlSameAs[company_RM_ATTR_TYPE_URIS.functionalClassification.uri]
    if (attrDef == null) return [null, null]

    const resourceUri = attrDef.getAttribute(IBM_XML_TAG_ATTRS.about)

    const range = getTag(IBM_XML_TAG_NAMES.attribute.range, attrDef)?.getAttribute(IBM_XML_TAG_ATTRS.resource)
    const attrTypeDef = state.component.selfTypesLookupTable[range]

    if (!attrTypeDef) return [null, null]

    const functionalEnumResource = getTags(IBM_XML_TAG_NAMES.rm.enumEntry, attrTypeDef)
        .find((entry) => getTag(IBM_XML_TAG_NAMES.owlSameAs, entry)?.getAttribute(IBM_XML_TAG_ATTRS.resource) === company_RM_ATTR_TYPE_URIS.functionalClassification.enums.functional)
        ?.getAttribute(IBM_XML_TAG_ATTRS.about)

    return [resourceUri, functionalEnumResource]
}

function getFunctionalClassificationValue(artObj, funcClassUri) {
    const xml = toXml(artObj[BOUND_ARTIFACT_OBJ])
    const hasFuncClassDef = getTags(IBM_XML_TAG_NAMES.rm.hasAttrDef, xml).find((entry) => entry.getAttribute(IBM_XML_TAG_ATTRS.resource) === funcClassUri)
    return getTag(IBM_XML_TAG_NAMES.rdfValue, hasFuncClassDef?.parentNode)?.getAttribute(IBM_XML_TAG_ATTRS.resource)
}

function getSignalTypeUrl(component) {
    const SIGNAL_TYPE_RDF_URI = "http://jazz.company.com/rm/artifacttypes#Signal"

    const objType = component.selfTypesLookupTableByOwlSameAs[SIGNAL_TYPE_RDF_URI]
    const signalTypeResourceUrl = objType?.getAttribute("rdf:about")

    const enumerationType = component.selfTypesLookupTableByOwlSameAs[company_RM_ATTR_TYPE_URIS.enumerationValues.uri]
    const enumerationValuesResourceUrl = enumerationType?.getAttribute("rdf:about")

    const minValueType = component.selfTypesLookupTableByOwlSameAs[company_RM_ATTR_TYPE_URIS.minValue.uri]
    const minValueResourceUrl = minValueType?.getAttribute("rdf:about")

    const maxValueType = component.selfTypesLookupTableByOwlSameAs[company_RM_ATTR_TYPE_URIS.maxValue.uri]
    const maxValueResourceUrl = maxValueType?.getAttribute("rdf:about")

    const resolutionType = component.selfTypesLookupTableByOwlSameAs[company_RM_ATTR_TYPE_URIS.resolution.uri]
    const resolutionResourceUrl = resolutionType?.getAttribute("rdf:about")

    return {
        signalTypeResourceUrl,
        enumerationValuesResourceUrl,
        minValueResourceUrl,
        maxValueResourceUrl,
        resolutionResourceUrl,
    }
}

function collectPossibleValuesOfSignals(signalReqs, { enumerationValuesResourceUrl, minValueResourceUrl, maxValueResourceUrl, resolutionResourceUrl }) {
    const findEntryByResource = (hasAttrValEntries, resourceUrl) => {
        return hasAttrValEntries.find((entry) => {
            const attrDef = getTag(IBM_XML_TAG_NAMES.rm.hasAttrDef, entry)
            return attrDef.getAttribute("rdf:resource") === resourceUrl
        })
    }

    const getAttrValStringValue = (entry) => {
        return entry ? getTag(IBM_XML_TAG_NAMES.rdfValue, entry)?.textContent.trim() : null
    }

    const signalsWithValuesMap = {}

    signalReqs.forEach((signalReq) => {
        const xml = toXml(signalReq[BOUND_ARTIFACT_OBJ])
        const hasAttrValEntries = getTags(IBM_XML_TAG_NAMES.rm.hasAttrVal, xml)

        const titleEntry = findEntryByResource(hasAttrValEntries, "http://purl.org/dc/terms/title")
        const signalTitle = getAttrValStringValue(titleEntry)

        if (signalTitle == null) return

        const enumValuesEntry = findEntryByResource(hasAttrValEntries, enumerationValuesResourceUrl)
        const enumerationValues = getAttrValStringValue(enumValuesEntry)

        const minValueEntry = findEntryByResource(hasAttrValEntries, minValueResourceUrl)
        const minValue = getAttrValStringValue(minValueEntry)

        const maxValueEntry = findEntryByResource(hasAttrValEntries, maxValueResourceUrl)
        const maxValue = getAttrValStringValue(maxValueEntry)

        const resolutionEntry = findEntryByResource(hasAttrValEntries, resolutionResourceUrl)
        const resolution = getAttrValStringValue(resolutionEntry)

        signalsWithValuesMap[signalTitle] = {
            enumerationValues,
            minValue,
            maxValue,
            resolution,
        }
    })

    return signalsWithValuesMap
}

export async function checkTestCases({ etmStreamURL, etmComponentURL, component }) {
    const start = performance.now()
    const { artifacts, artIdsInView, artTypesMap, componentsData } = state

    const abortHandler = renderer.loadingLayer.getAbortHandler()

    if (artifacts == null || artTypesMap == null) {
        renderer.notification.errorCloseable("Failed to retrieve / views from the module!")
        renderer.loadingLayer.hide()
        return
    }

    renderer.loadingLayer.show("Loading existing test cases...")
    const arts = getArtsTagsInView({ artifacts, artIdsInView })
    const [funcClassUri, funcClassValueUri] = getFunctionalClassificationUris()
    const requirements = funcClassUri && funcClassValueUri ? filterRequirementsFromArtifacts(arts, artTypesMap).filter((req) => getFunctionalClassificationValue(req, funcClassUri) === funcClassValueUri) : filterRequirementsFromArtifacts(arts, artTypesMap)

    if (componentsData == null) {
        renderer.notification.errorCloseable("No components data found!")
        renderer.loadingLayer.hide()
        return
    }

    openAI.setClient(state.client)

    renderer.loadingLayer.showProgress()
    renderer.loadingLayer.toggleAbortable(null, false)
    renderer.prepareLogger()

    try {
        renderer.loadingLayer.show("Getting relevant test cases. This may take a while...")
        const selectedComponent = componentsData[etmComponentURL]

        const { testCases, etmStreamsData } = await fetchTestCasesAndStreamDataFromComponent({ selectedComponent, etmComponentURL, etmStreamURL, abortHandler })
        const invalidatedArts = testCases.length === 0 ? requirements : filterInvalidatedRequirements(requirements, testCases)

        const invalidatedArtsCount = invalidatedArts.length
        if (invalidatedArtsCount === 0) {
            renderer.notification.warnClosable("No requirements lacking test cases in the selected ETM component!")
            renderer.loadingLayer.hide()
            return
        }

        const shouldCheckTestCases = await confirmWithDialog({ title: "Confirm Create Test Cases", html: `<strong>${invalidatedArtsCount}</strong> functional requirements lack linked test cases to the ${selectedComponent.title}.\nAre you sure to update them?` })

        if (!shouldCheckTestCases) {
            return false
        }

        const { serviceReady, message } = await isServiceReady(openAI)
        if (!serviceReady) {
            const shouldEnqueueReq = await showServiceBusy(renderer, message)
            if (!shouldEnqueueReq) return false
        }

        renderer.loadingLayer.show("Adding job to queue...")

        renderer.loadingLayer.show("Preparing Data for Test Case Generation...")
        const dataForTestCases = await prepareInputDataForAIs({
            selectedComponent,
            etmStreamsData,
            existingTestCases: testCases,
        })

        const {
            status,
            data: { queueLength },
        } = await openAI.subscribeRequestToServer({
            data: {
                allArtifacts: extractPrimaryTextAndSimplifyArtifactObjects(artifacts, { getTestLevel: false }),
                artifacts: extractPrimaryTextAndSimplifyArtifactObjects(invalidatedArts, { getTestLevel: true, artTypesMap }),
                dataForTestCases,
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
            tool: "test-cases-generation",
        })

        if (status !== "success") {
            throw new Error("Failed to add job to queue!")
        }

        const enqueuedMessage = `Generating Test Cases has been added to queue and is currently in the <strong>${getOrdinal(queueLength)}</strong> position.`
        await Promise.allSettled([
            renderer.notify({ title: "Job added", message: enqueuedMessage }),
            // actionLogWrapper.logAnAction(STATS_WIDGET_ACTIONS, {
            //     artifactsCount: arts.length,
            // }),
        ])

        const duration = performance.now() - start
        console.log(duration)
        saveStorage(CHECK_TEST_CASES, duration)
    } catch (err) {
        renderer.notification.errorNoClosable(err?.message || "Something went wrong trying to get components or test cases data!")
    } finally {
        renderer.loadingLayer.setProgress(0)
        renderer.loadingLayer.hideProgress()
        renderer.loadingLayer.toggleAbortable(null, false)
        renderer.finishLogging()
        renderer.loadingLayer.hide()
    }
}

/* 
    TODO: Check if we need the following functions or not
    If yes, then should we keep them here or in other file
*/
async function exportTestCasesCreation(responses) {
    const content = createElement("div")
    content.innerHTML = `<strong>${responses.length}</strong> requirmeents have test cases linked. Do you want to export it!`

    await renderer.setGeneralDialogContent({
        title: "Test Cases Creation Results",
        content,
        submittable: true,
        submitText: "Export Results",
        onSubmit: (e) => {
            if (renderer.isDialogCancelButton(e)) {
                return
            }

            const logContent = csmaker({
                headers: ["Requirement ID", "Existing Test Case IDs", "New Test Case IDs"],
                data: responses.map((resValue) => {
                    const { createLinkSuccessList, linkExistSuccessList, reqID } = resValue

                    return {
                        ["Requirement ID"]: reqID,
                        ["Existing Test Case IDs"]: `"${linkExistSuccessList.join(", ")}"`,
                        ["New Test Case IDs"]: `"${createLinkSuccessList.join(", ")}"`,
                    }
                }),
            })

            // TODO: Should get the moduleTitle from the server data instead
            const logContentWithModuleInfo = `Module Title, ${moduleInfo?.title}\n" "\n" "\n${logContent}`
            exportFile(logContentWithModuleInfo, "text/csv;charset=utf-8", `Test Cases creation - ${renderer.getModuleTitle()} - ${new Date().toLocaleDateString()}`)
        },
        styles: {
            "min-height": "unset",
            "max-height": "unset",
            height: "max-content",
            "box-shadow": "none",
        },
    })

    renderer.showEventLoggerDialog()
}
