import { REQ_PER_TIME, ATTR_RDF_URI_DOMAIN, TRANSLATE_ATTR_NAME, TOXIC_ATTR_NAME, QUALITY_ATTR_NAME, CONSISTENCY_ATTR_NAME, STATS_WIDGET_ACTIONS } from "../config/constants.js"
import { csmaker, exportFile, qs } from "../utils/helper.js"
import { getStatsAction } from '../utils/toolHelper.js'
import { checkCustomAttributes } from "./component.js"
import renderer from "../view/Renderer.js"
import { fetchItemsInBatches, getFetchErrorMessage } from "../utils/fetchHelper.js"
import Component from "../models/Component.js"
import { queryModuleArtifacts } from "./module.js"
import { buildArtifactTypeMapByResources, createAndFilterArtifactAIs } from "../utils/artifactHelper.js"
import { handleCreateAndLinkNewTestCases, handleLinkExistingTestCases } from "./testcases.js"
import { getAIInstanceFromTool } from "../utils/getAIInstanceFromTool.js"
    
export async function updateAttribute(artifactWithAIs, component, { loadingText = "Updating attribute...", e, attributeName, targetArtTypes = null }) {
    renderer.loadingLayer.show(loadingText)
    renderer.loadingLayer.toggleAbortable(null, true)

    const form = e.target.closest('[data-dialog-form="multi-purpose"]')

    if (form == null) {
        renderer.loadingLayer.hideProgress()
        renderer.loadingLayer.setProgress(0)
        renderer.loadingLayer.hide()
        return
    }

    const content = qs("[data-content]", form)
    const issuesListJson = qs("[data-issues-list]", content)?.dataset.issuesList
    const issuesList = issuesListJson != null ? JSON.parse(issuesListJson) : null

    if (issuesList == null) {
        renderer.loadingLayer.hideProgress()
        renderer.loadingLayer.setProgress(0)
        renderer.loadingLayer.hide()
        return
    }

    renderer.loadingLayer.show(`Checking attribute ${attributeName}...`)

    const resourceURI = await checkCustomAttributes(renderer, component, { attributeName, attributeRDFURI: `${ATTR_RDF_URI_DOMAIN}${attributeName}`, targetArtTypes })
    if (resourceURI == null) {
        renderer.notification.errorNoClosable(`Something went wrong when we try to check/create the attribute ${attributeName}`)
        renderer.loadingLayer.hideProgress()
        renderer.loadingLayer.setProgress(0)
        renderer.loadingLayer.hide()

        return false
    }

    renderer.loadingLayer.show(`Updating attribute ${attributeName}`)
    renderer.loadingLayer.showProgress()

    const promiseHandler = async ({ artId, message }) => {
        try {
            const art = artifactWithAIs.find((art) => art.id == artId)
            if (art == null) throw new Error(`No artifact found with ID ${artId}`)

            await art.updateAttribute({
                attrResourceUrl: resourceURI,
                dataType: "http://www.w3.org/2001/XMLSchema#string",
                value: message,
            })
        } catch (err) {
            const message = getFetchErrorMessage(err, `Update ${attributeName} attribute of artifact ${art.id}`)
            throw new Error(message)
        }
    }

    const progressHandler = ({ currentIndex, totalIndices }) => {
        renderer.loadingLayer.setProgress(((currentIndex / totalIndices) * 100).toFixed(2))
    }

    await fetchItemsInBatches(issuesList, REQ_PER_TIME, promiseHandler, progressHandler, null)

    renderer.loadingLayer.hideProgress()
    renderer.loadingLayer.setProgress(0)
    renderer.notification.successClosable("Attributes have been updated successfully!")
    renderer.loadingLayer.hide()
}

export function getAttributeNameFromBackground(tool) {
    switch (tool) {
        case "translate":
            return TRANSLATE_ATTR_NAME
        case "toxic":
            return TOXIC_ATTR_NAME
        case "quality":
            return QUALITY_ATTR_NAME
        case "consistency":
            return CONSISTENCY_ATTR_NAME
        default:
            return null
    }
}

async function updateAttributeFromServer({ rawArtifactObjs, artifactResultMap, filterCallback, attributeName, targetArtTypes = null, projectId, configPreset, artTypesMap, configURI, changesetURL, component }) {
    const artifactWithAIs = createAndFilterArtifactAIs(rawArtifactObjs, filterCallback, { projectId, configPreset, artTypesMap, configURI, changesetURL, component })

    renderer.loadingLayer.show(`Checking attribute ${attributeName}...`)

    const resourceURI = await checkCustomAttributes(renderer, component, { attributeName, attributeRDFURI: `${ATTR_RDF_URI_DOMAIN}${attributeName}`, targetArtTypes })

    if (resourceURI == null) {
        renderer.notification.errorNoClosable(`Something went wrong when we try to check/create the attribute ${attributeName}`)
        // renderer.loadingLayer.hideProgress()
        // renderer.loadingLayer.setProgress(0)
        // renderer.loadingLayer.hide()

        return false
    }

    renderer.loadingLayer.show(`Updating attribute ${attributeName}`)
    renderer.loadingLayer.showProgress()
    renderer.prepareLogger()

    const promiseHandler = async (artifact) => {
        try {
            if (!artifactResultMap.has(artifact.id)) {
                throw new Error(`No artifact found with ID ${artId}`)
            }

            const message = artifactResultMap.get(artifact.id)

            await artifact.updateAttribute({
                attrResourceUrl: resourceURI,
                dataType: "http://www.w3.org/2001/XMLSchema#string",
                value: message,
            })

            renderer.logSuccess(`Artifact ${artifact.id}: ${attributeName} updated successfully!`)
        } catch (err) {
            const message = `Artifact ${artifact.id}: ${attributeName} failed to update!`
            renderer.logError(message)
            throw new Error(message)
        }
    }

    const progressHandler = ({ currentIndex, totalIndices }) => {
        renderer.updateProgress(((currentIndex / totalIndices) * 100).toFixed(2))
    }

    const responses = await fetchItemsInBatches(artifactWithAIs, REQ_PER_TIME, promiseHandler, progressHandler, null)

    return responses
}

function exportConsistencyDataFromServer({ consistencyData, module: { title } }) {
    const REQ_IDS_HEADER = "Requirement IDs"
    const ISSUE_CONTENT_HEADER = "Issue Content"

    const logContent = csmaker({
        headers: [REQ_IDS_HEADER, ISSUE_CONTENT_HEADER],
        data: consistencyData.flatMap(({ pairsWithIssues }) => {
            return pairsWithIssues.map(({ pairIds, message }) => {
                return {
                    [REQ_IDS_HEADER]: `"${pairIds.join(", ")}"`,
                    [ISSUE_CONTENT_HEADER]: `"${message}"`,
                }
            })
        }),
    })

    const logDataWithModuleTitle = `Module Title, ${title}\n" "\n" "\n${logContent}`
    exportFile(logDataWithModuleTitle, "text/csv;charset=utf-8", `Consistency - ${title} - ${new Date().toLocaleDateString()}`)
}

function getArtifactResultMapFromTool(data, tool) {
    const artifactResultMap = new Map()

    switch (tool) {
        case "translate":
        case "toxic":
        case "quality": {
            data.forEach(({ artId, message }) => {
                artifactResultMap.set(artId, message)
            })
            break
        }

        case "consistency": {
            data.consistencyIssuesData.forEach(({ pairsWithIssues }) => {
                pairsWithIssues.forEach(({ pairIds, message }) => {
                    pairIds.forEach((artId) => {
                        const existingMessage = artifactResultMap.has(`${artId}`) ? artifactResultMap.get(`${artId}`) : ""
                        artifactResultMap.set(`${artId}`, `${existingMessage}\n\n${message}`.trim())
                    })
                })
            })
            break
        }

        case "test-cases-generation": {
            data.testCasesOfRequirements.forEach(({ requirementData }) => {
                artifactResultMap.set(`${requirementData.id}`, true)
            })
            break
        }

        default:
            throw new Error(`Invalid tool of ${tool}`)
    }

    return artifactResultMap
}

function getFilterArtifactCallbackFromTool(tool) {
    switch (tool) {
        case "translate":
            return (art) => art.primaryText != null
        default:
            return (art) => {
                if (art.primaryText == null) return false
                if (!art.type?.toLowerCase().includes("requirement") && !art.type?.toLowerCase().includes("req")) return false
                return true
            }
    }
}

export async function updateSelectedResultsToDNG(selectedResults, hostContext, actionLogWrapper) {
    const resTotal = selectedResults.length
    renderer.loadingLayer.show("Processing selected data...")

    let successTotal = 0
    const messages = []

    for (let i = 0; i < resTotal; i++) {
        const { data, sessionId, tool, dngWorkspace: DNGSpaceConfig } = selectedResults[i]

        const aiInstance = getAIInstanceFromTool(tool)
        const artifactResultMap = getArtifactResultMapFromTool(data, tool)
        const attributeName = getAttributeNameFromBackground(tool)
        const filterCallback = getFilterArtifactCallbackFromTool(tool)

        const component = new Component(
            {
                name: null,
                url: DNGSpaceConfig.componentURL,
                urlInProject: DNGSpaceConfig.componentURL,
            },
            {
                configType: "Changeset",
                name: "",
                url: DNGSpaceConfig.changesetURL,
            },
            hostContext
        )

        DNGSpaceConfig.hostContext = hostContext
        DNGSpaceConfig.component = component

        try {
            const [artsRes, cmpTypeRes] = await Promise.allSettled([
                queryModuleArtifacts({
                    hostContext,
                    moduleURI: DNGSpaceConfig.module.uri,
                    componentUrlInProject: DNGSpaceConfig.component.urlInProject,
                    configURI: DNGSpaceConfig.configURI,
                }),
                DNGSpaceConfig.component.fetchComponentObjectType(),
            ])

            let rawArtifactObjs = artsRes.status === "fulfilled" ? artsRes.value : null
            const cmpTypeResult = cmpTypeRes.status === "fulfilled" ? cmpTypeRes.value : null

            if (cmpTypeResult.status === "fail") {
                await aiInstance.removeFinishedRequest(sessionId)
                messages.push(`${DNGSpaceConfig.module.title}: ${cmpTypeResult.error.detail}`)

                continue
            }

            if (rawArtifactObjs == null || rawArtifactObjs.length === 0) {
                messages.push(`${DNGSpaceConfig.module.title}: No artifacts found!`)
                continue
            }

            rawArtifactObjs = rawArtifactObjs.filter((art) => artifactResultMap.has(art.id))
            const artTypesMap = buildArtifactTypeMapByResources(DNGSpaceConfig.component.xml)

            await useResultsOnArtifacts({
                tool,
                data,
                rawArtifactObjs,
                artifactResultMap,
                filterCallback,
                attributeName,
                artTypesMap,
                DNGSpaceConfig,
                actionLogWrapper,
            })

            await aiInstance.removeFinishedRequest(sessionId)
            successTotal++
        } catch (err) {
            console.error(err)
        }
    }

    renderer.loadingLayer.hide()
    renderer.finishLogging()

    if (successTotal === resTotal) {
        return {
            status: "success",
            message: `Sessions' results are updated successfully!`,
            messages,
        }
    }

    return {
        status: "partial-success",
        message: `Some sessions are not updated!`,
        messages,
    }
}

async function useResultsOnArtifacts({ tool, data, rawArtifactObjs, artifactResultMap, filterCallback, attributeName, artTypesMap, DNGSpaceConfig, actionLogWrapper }) {
    switch (tool) {
        case "translate":
        case "toxic":
        case "quality": {
            await updateAttributeFromServer({
                rawArtifactObjs,
                artifactResultMap,
                filterCallback,
                attributeName,
                artTypesMap,
                ...DNGSpaceConfig,
            })

            // await actionLogWrapper.logAnAction(getStatsAction(tool, "update")?.name, {
            //     artifactsCount: rawArtifactObjs.length,
            // })

            break
        }

        case "consistency": {
            exportConsistencyDataFromServer({
                consistencyData: data.consistencyIssuesData,
                ...DNGSpaceConfig,
            })

            // await actionLogWrapper.logAnAction(STATS_WIDGET_ACTIONS.consistency.export.name, {
            //     consistencyLength: data.consistencyIssuesData.length,
            // })

            break
        }

        case "test-cases-generation": {
            await createOrLinkTestCasesFromServer(data, rawArtifactObjs, artTypesMap, DNGSpaceConfig)
            break
        }

        default:
            throw new Error("Invalid tool specified!")
    }
}

async function createOrLinkTestCasesFromServer(ETMData, rawArtifactObjs, artTypesMap, DNGSpaceConfig) {
    const { testCasesOfRequirements: testCasesForRequirements, commonEtmTCEnvVariables } = ETMData

    const groupsWithTestCasesToCreate = testCasesForRequirements.filter((group) => group.testCasesToGenerate?.length > 0)
    if (groupsWithTestCasesToCreate.length > 0) {
        const createTestCasesResponses = await handleCreateAndLinkNewTestCases(groupsWithTestCasesToCreate, rawArtifactObjs, artTypesMap, DNGSpaceConfig, commonEtmTCEnvVariables)

        createTestCasesResponses.forEach((res) => {
            if (res.status == "fulfilled") {
                const { reqId, successList, failList } = res.value
                if (successList.length) {
                    renderer.logSuccess(`Requirement ${reqId}: links established to NEW test cases ${successList.join(", ")} successfully!`)
                }

                if (failList.length) {
                    renderer.logError(`Requirement ${reqId}: links failed to be established to NEW test cases ${failList.join(", ")}`)
                }
            } else {
                renderer.logError(res.reason)
            }
        })
    }

    // const groupsWithExistingTestCases = testCasesForRequirements.filter((group) => group.matchedTCs.length > 0)
    // if (groupsWithExistingTestCases.length > 0) {
    //     const linkExistingResponses = await handleLinkExistingTestCases(groupsWithExistingTestCases, DNGSpaceConfig)

    //     linkExistingResponses.forEach((res) => {
    //         if (res.status == "fulfilled") {
    //             const { reqId, successList, failList } = res.value
    //             if (successList.length) {
    //                 renderer.logSuccess(`Requirement ${reqId}: links established to EXISTING test cases ${successList.join(", ")} successfully!`)
    //             }

    //             if (failList.length) {
    //                 renderer.logError(`Requirement ${reqId}: links failed to be established to EXISTING test cases ${failList.join(", ")}`)
    //             }
    //         } else {
    //             renderer.logError(res.reason)
    //         }
    //     })
    // }
}
