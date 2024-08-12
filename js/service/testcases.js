import { getLinkProxyXmlAndEtag, postLinkCache, putLinkProxy, getTCCategoriesData, getTemplateItemId } from "./etmService.js"
import { company_RM_ATTR_TYPE_URIS, BOUND_ARTIFACT_OBJ, LOCAL_STORAGE_KEY, REQ_PER_TIME, IBM_XML_TAG_NAMES, IBM_XML_TAG_ATTRS, company_RM_ARTIFACT_TYPE_URIS, company_TESTCASES_ATTRS, JAZZ_LINK_SERVICE_TRACE_LINKS } from "../config/constants.js"
import { domParser, getTag, getTags, splitPromiseSettledResponses } from "../utils/helper.js"
import { fetchItemsInBatches } from "../utils/fetchHelper.js"

export const H_TESTLEVEL_BY_ART_TYPE_URI_MAP = new Map([
    [company_RM_ARTIFACT_TYPE_URIS.HWRequirement, company_TESTCASES_ATTRS.testLevel.values.HWTest],
    [company_RM_ARTIFACT_TYPE_URIS.MDRequirement, company_TESTCASES_ATTRS.testLevel.values.MDTest],
    [company_RM_ARTIFACT_TYPE_URIS.SWRequirement, company_TESTCASES_ATTRS.testLevel.values.SWTest],
    [company_RM_ARTIFACT_TYPE_URIS.SysRequirement, company_TESTCASES_ATTRS.testLevel.values.SysTestFunc],
    // ["http://jazz.company.com/rm/artifacttypes#StakeholderRequirement", ""],
])

export const H_TESTLEVEL_BY_ART_TYPE_NAME_MAP = new Map([
    ["HW Requirement", company_TESTCASES_ATTRS.testLevel.values.HWTest],
    ["MD Requirement", company_TESTCASES_ATTRS.testLevel.values.MDTest],
    ["SW Requirement", company_TESTCASES_ATTRS.testLevel.values.SWTest],

    ["Hardware Requirement", company_TESTCASES_ATTRS.testLevel.values.HWTest],
    ["Software Requirement", company_TESTCASES_ATTRS.testLevel.values.SWTest],

    ["System Requirement", company_TESTCASES_ATTRS.testLevel.values.SysTestFunc],
])

export async function handleCreateAndLinkNewTestCases(groupsWithTestCasesToCreate, rawRequirementsObj, artTypesMap, DNGSpaceConfig, commonEtmTCEnvVariables) {
    const { etmProjectId, etmHostContext, etmStreamUrl } = commonEtmTCEnvVariables
    const REQ_PER_TIME = 1
    const fullRequirementMap = new Map()

    const [categoriesData, { templateItemId, templateStateId }] = await Promise.all([
        getTCCategoriesData({ etmProjectId, etmHostContext, etmStreamUrl }),
        getTemplateItemId({
            etmHostContext,
            etmProjectId,
            etmStreamUrl,
        }),
    ])

    const [_, H_TestLevelCategories] = getH_TestLevelCategories(categoriesData)

    commonEtmTCEnvVariables.categoriesData = categoriesData
    commonEtmTCEnvVariables.templateItemId = templateItemId
    commonEtmTCEnvVariables.templateStateId = templateStateId
    commonEtmTCEnvVariables.H_TestLevelCategories = H_TestLevelCategories

    rawRequirementsObj.forEach((requirement) => {
        const baseArtXml = domParser.parseFromString(requirement[BOUND_ARTIFACT_OBJ], "application/xml")
        const artType = artTypesMap.get(getTag(IBM_XML_TAG_NAMES.rm.ofType, baseArtXml)?.getAttribute("rdf:resource"))

        fullRequirementMap.set(requirement.id, {
            ...requirement,
            type: artType?.type,
            typeRdfUri: artType?.typeRdfUri,
            xml: baseArtXml,
        })
    })

    const createTestCasePromiseHandler = async ({ requirementData, testCasesToGenerate }) => {
        try {
            const newTestCasesData = testCasesToGenerate.reduce((list, item) => {
                if (item == null) return list

                if (item.description == null || item.title == null || item.title === "" || item.description === "") {
                    return list
                }

                return [...list, item]
            }, [])

            const [successList, failList] = await createAndLinkNewTestCases({ requirementData, DNGSpaceConfig, newTestCasesData, fullRequirementMap, commonEtmTCEnvVariables })

            return {
                reqId: requirementData.id,
                successList,
                failList,
            }
        } catch (err) {
            console.error(err)
            throw err
        }
    }

    const createTestCasesResponses = await fetchItemsInBatches(groupsWithTestCasesToCreate, REQ_PER_TIME, createTestCasePromiseHandler, null, null)

    const testCaseIdsWithDesigns = createTestCasesResponses.reduce((arr, res) => {
        if (res.status === "rejected") return arr
        const successList = res.value.successList

        if (successList == null) return arr

        return [...arr, ...successList]
    }, [])

    const testCaseIdsWithDesignsMap = testCaseIdsWithDesigns.reduce((map, item) => {
        const { id, design } = item

        return {
            ...map,
            [id]: design,
        }
    }, {})

    const getLatestTestCaseDataHandler = async ({ id }) => {
        return getTestCaseComposite(id, { etmHostContext, etmProjectId, etmStreamUrl })
    }

    const TESTCASES_PER_REQ = 15
    const getLatestTestCasesDataResponses = await fetchItemsInBatches(testCaseIdsWithDesigns, TESTCASES_PER_REQ, getLatestTestCaseDataHandler, null, null)
    const latestTestCasesDataMappedDesign = getLatestTestCasesDataResponses.reduce((mapped, res) => {
        if (res.status === "rejected") return mapped

        return [...mapped, { design: testCaseIdsWithDesignsMap[res.value.id], testcaseData: res.value }]
    }, [])

    const itemUpdates = latestTestCasesDataMappedDesign.map(({ design, testcaseData }) => {
        const designContent = configTestCaseDesign(design)
        return {
            TransactionId: "1",
            ItemDetails: {
                Links: null,
                Attributes: {
                    weight: testcaseData.weight,
                    triggerId: "",
                    activityId: "",
                    workItemsJsonString: "[]",
                    sectionJsonString: `[{\"name\":\"Test Case Design\",\"description\":\"Defines the sequence of steps to be executed. During an automatic transfer to a Manual Test Script, one step is generated from each line.\",\"_eQualifiedClassName\":\"com.ibm.rqm.planning.rest.dto:SectionDTO\",\"id\":\"com.ibm.rqm.planning.editor.section.testCaseDesign\",\"content\":null,\"attributes\":[{\"type\":\"richtext\",\"name\":\"content\",\"value\":\"<div xmlns=\\\"http://www.w3.org/1999/xhtml\\\"><p>${designContent}</p></div>\"}]}]`,
                    componentUUID: testcaseData.fgc.componentID,
                    newTestCase: false,
                    name: testcaseData.name,
                    state: testcaseData.state,
                    ownerId: testcaseData.owner.itemId,
                    priority: testcaseData.priority.id,
                    description: testcaseData.description,
                    workflowAction: null,
                    // gcConfigValue: "https://almt.company.com/gc/configuration/5056",
                },
                ReferencesNew: [],
                ReferencesNewWithCreate: [],
                ReferencesRemoved: [],
                LinksNew: [],
                LinksRemoved: [],
            },
            componentUUID: testcaseData.fgc.componentID,
            ItemType: {
                PackageURI: "com.ibm.rqm.planning",
                ItemTypeName: "TestCase",
            },
            versionedItemId: testcaseData.versionableItemId,
            versionedStateId: testcaseData.versionableStateId,
            ItemId: testcaseData.itemId,
            StateId: testcaseData.stateId,
        }
    })

    try {
        await updateTestCaseDesigns(itemUpdates, { ...commonEtmTCEnvVariables })
    } catch (err) {
        console.error(err)
    }

    return createTestCasesResponses
}

async function createAndLinkNewTestCases({ requirementData, DNGSpaceConfig, newTestCasesData, fullRequirementMap, commonEtmTCEnvVariables }) {
    const TESTCASES_PER_REQ = 5
    const { H_TestLevelCategories, categoriesData } = commonEtmTCEnvVariables
    const { component } = DNGSpaceConfig

    try {
        const H_TestCaseTypeId = getH_TestCaseType(categoriesData)
        const H_RelevanceId = getH_Relevance(categoriesData)
        const H_TestLevelId = getH_TestLevel(fullRequirementMap.get(requirementData.id?.toString()), H_TestLevelCategories)
        const H_FuSa_QM_Id = getFuSa_QM_IDFromRequirement(categoriesData, fullRequirementMap.get(requirementData.id?.toString()), component)

        const promiseHandler = async ({ description, title, testCaseDesign }) => {
            // Need to analyze this error
            if (
                H_TestLevelId == null ||
                H_TestCaseTypeId == null
                // || H_RelevanceId == null
            ) {
                console.log("H_TestLevelID: ", H_TestLevelId)
                console.log("H_TestCaseTypeId", H_TestCaseTypeId)
                console.log("H_RelevanceId", H_RelevanceId)
                console.log("H_TestLevelCategories", H_TestLevelCategories)
                throw new Error("Failed to get all three required test case options: Test Level, Test Case Type, Relevance")
            }

            return await createAndLinkTC({
                testCaseData: {
                    testCaseName: title,
                    description,
                    design: testCaseDesign ? JSON.stringify(testCaseDesign, null, 2) : null,
                },
                requirementData,
                commonEtmTCEnvVariables,
                requiredTestCaseAttrs: {
                    H_TestLevelId,
                    H_TestCaseTypeId,
                    H_RelevanceId,
                },
                optionalTestCaseAttrs: {
                    H_FuSa_QM_Id,
                },
                DNGSpaceConfig,
            })
        }

        const createAndLinKResponses = await fetchItemsInBatches(newTestCasesData, TESTCASES_PER_REQ, promiseHandler, null)

        return splitPromiseSettledResponses(createAndLinKResponses)
    } catch (err) {
        throw err
    }
}

function getH_TestCaseType(categoriesData) {
    return getSingleCategoryFromData(categoriesData, company_TESTCASES_ATTRS.testType.externalUrl, company_TESTCASES_ATTRS.testType.title, company_TESTCASES_ATTRS.testType.categoryName)
}

function getH_Relevance(categoriesData) {
    return getSingleCategoryFromData(categoriesData, company_TESTCASES_ATTRS.relevance.externalUrl, company_TESTCASES_ATTRS.relevance.title, company_TESTCASES_ATTRS.relevance.categoryName)
}

function getSingleCategoryFromData(categoriesData, externalURI, name, categoryName) {
    const item = categoriesData.find((item) => item.name.trim() === name && item.externalURI === externalURI)

    if (item == null) {
        console.error(`Cannot find any ${name} in the current project`)
        // throw new Error(`Cannot find any ${name} in the current project`)
        return null
    }

    const categoryId = item?.categories?.find((category) => category?.name.toLowerCase() === categoryName.toLowerCase())?.itemId
    return categoryId
}

function getH_TestLevel(requirementData, H_TestLevelCategories) {
    const { typeRdfUri, type } = requirementData
    const testLevelRdfUri = typeRdfUri ? H_TESTLEVEL_BY_ART_TYPE_URI_MAP.get(typeRdfUri) : H_TESTLEVEL_BY_ART_TYPE_NAME_MAP.get(type)

    const testLevelData = H_TestLevelCategories.find((testLevel) => {
        return !testLevel.archived && testLevel.externalURI === testLevelRdfUri
    })

    return testLevelData?.itemId
}

function getH_FuSa_QM_Classification(categoriesData, reqSafetyTitle, reqFailureConsequenceTitle) {
    if (reqSafetyTitle == null) return null

    if (reqSafetyTitle.startsWith("QM")) {
        if (reqFailureConsequenceTitle == null) return null
        return getQMClassification(categoriesData, reqFailureConsequenceTitle)
    }

    return getH_FuSaClassification(categoriesData, reqSafetyTitle)
}

function getQMClassification(categoriesData, reqFailureConsequenceTitle) {
    const item = categoriesData.find((item) => item.name.trim() === company_TESTCASES_ATTRS.fuSa.title && item.externalURI === company_TESTCASES_ATTRS.fuSa.externalUrl)

    if (item == null) {
        throw new Error(`Cannot find any ${company_TESTCASES_ATTRS.fuSa.title} in the current project`)
    }

    const categoryId = item?.categories?.find((category) => category.name?.startsWith("QM") && category.name?.toLowerCase().includes(reqFailureConsequenceTitle.toLowerCase()))?.itemId
    return categoryId
}

function getH_FuSaClassification(categoriesData, reqSafetyTitle) {
    const item = categoriesData.find((item) => item.name.trim() === company_TESTCASES_ATTRS.fuSa.title && item.externalURI === company_TESTCASES_ATTRS.fuSa.externalUrl)

    if (item == null) {
        throw new Error(`Cannot find any ${company_TESTCASES_ATTRS.fuSa.title} in the current project`)
    }

    const categoryId = item?.categories?.find((category) => reqSafetyTitle.toLowerCase().includes(category.name?.toLowerCase()))?.itemId
    return categoryId
}

function getFuSa_QM_IDFromRequirement(categoriesData, requirementData, component) {
    const reqSafetyTitle = getRequirementH_SafetyTitle(requirementData, component)
    const reqFailureConsequenceTitle = getRequirementH_FailureConsequenceTitle(requirementData, component)

    return getH_FuSa_QM_Classification(categoriesData, reqSafetyTitle, reqFailureConsequenceTitle)
}

function getRequirementH_FailureConsequenceTitle(req, component) {
    return getRequirementEnumTitle(req, component, company_RM_ATTR_TYPE_URIS.failureConsequence.uri)
}

function getRequirementH_SafetyTitle(req, component) {
    return getRequirementEnumTitle(req, component, company_RM_ATTR_TYPE_URIS.safetyClassification.uri)
}

function getRequirementEnumTitle(req, component, jazzcompanyUri) {
    const attrDef = component.selfTypesLookupTableByOwlSameAs[jazzcompanyUri]
    if (attrDef == null) return [null, null]

    const resourceUri = attrDef.getAttribute(IBM_XML_TAG_ATTRS.about)

    const range = getTag(IBM_XML_TAG_NAMES.attribute.range, attrDef)?.getAttribute(IBM_XML_TAG_ATTRS.resource)
    const attrTypeDef = component.selfTypesLookupTable[range]

    if (!attrTypeDef) return [null, null]

    const hasDef = getTags(IBM_XML_TAG_NAMES.rm.hasAttrDef, req.xml).find((entry) => entry.getAttribute(IBM_XML_TAG_ATTRS.resource) === resourceUri)
    const value = getTag(IBM_XML_TAG_NAMES.rdfValue, hasDef?.parentNode)?.getAttribute(IBM_XML_TAG_ATTRS.resource)

    const enumEntry = getTags(IBM_XML_TAG_NAMES.rm.enumEntry, attrTypeDef).find((entry) => entry.getAttribute(IBM_XML_TAG_ATTRS.about) === value)
    const enumTitle = getTag(IBM_XML_TAG_NAMES.dctermsTitle, enumEntry)?.textContent.trim()

    return enumTitle
}

async function getTestCaseComposite(id, { etmHostContext, etmProjectId, etmStreamUrl }) {
    const url = new URL(`${etmHostContext}/service/com.ibm.rqm.web.common.service.rest.ICompositeWebRestService/artifact`)
    url.searchParams.append("processArea", etmProjectId)
    url.searchParams.append("artifactType", "TestCase")
    url.searchParams.append("oslc_config.context", etmStreamUrl)
    url.searchParams.append("id", id)

    const fetchOptions = {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            accept: "text/json",
        },
        method: "GET",
    }

    const res = await fetch(url, fetchOptions)
    const data = await res.json()

    return data["soapenv:Body"].response.returnValue.value.testcase
}

async function updateTestCaseDesigns(itemUpdates, { etmHostContext, etmProjectId, etmStreamUrl }) {
    try {
        const url = new URL(`${etmHostContext}/secure/service/com.ibm.rqm.common.service.IDocumentRawService`)
        url.searchParams.append("oslc_config.context", etmStreamUrl)
        url.searchParams.append("webContext.projectArea", etmProjectId)

        const documentStringObj = {
            documentJsonString: {
                ItemsCreate: [],
                ItemsUpdate: itemUpdates,
            },
            processAreaUUID: etmProjectId,
        }

        const fetchOptions = {
            headers: {
                "Content-Type": "text/json; charset=UTF-8",
                accept: "text/json",
            },
            method: "POST",
            body: JSON.stringify(documentStringObj),
        }

        const res = await fetch(url, fetchOptions)
    } catch (err) {
        throw err
    }
}
    
function configTestCaseDesign(design) {
    let designStr = design

    // if (!design.startsWith("{")) designStr = "{" + designStr
    // if (!design.endsWith("}")) designStr += "}"

    // const designJson = JSON.parse(designStr)

    return designStr.replaceAll("{{", "").replaceAll("}}", "").replaceAll("'", "").replaceAll('"', "").replaceAll("\n", "<br>")
  
    // return designJson
}

async function createAndLinkTC({ testCaseData, requirementData, commonEtmTCEnvVariables, DNGSpaceConfig, requiredTestCaseAttrs, optionalTestCaseAttrs }) {
    const { testCaseName, description = "", design = "" } = testCaseData
    const { etmProjectId, etmHostContext } = commonEtmTCEnvVariables
    const { H_TestLevelId, H_TestCaseTypeId, H_RelevanceId } = requiredTestCaseAttrs
    const { H_FuSa_QM_Id } = optionalTestCaseAttrs

    try {
        const createdTestCaseData = await createTestCase({
            testCaseName,
            description,
            H_TestLevelId,
            H_TestCaseTypeId,
            H_RelevanceId,
            H_FuSa_QM_Id,
            ...commonEtmTCEnvVariables,
        })

        const tcValue = createdTestCaseData?.["soapenv:Body"]?.response?.returnValue?.value
        const { versionableItemId, id } = tcValue

        await linkTestCaseToRequirement({
            DNGSpaceConfig,
            versionableItemURI: `${etmHostContext}/oslc_qm/contexts/${etmProjectId}/resources/com.ibm.rqm.planning.VersionedTestCase/${versionableItemId}`,
            requirementData,
        })

        return {
            id,
            design,
        }
    } catch (error) {
        console.error(error)
        throw error
    }
}

async function createTestCase({ testCaseName, description = "", H_TestLevelId, H_TestCaseTypeId, H_RelevanceId, H_FuSa_QM_Id, templateItemId, templateStateId, etmProjectId, etmStreamUrl, etmHostContext }) {
    if (
        testCaseName == null ||
        H_TestLevelId == null ||
        H_TestCaseTypeId == null ||
        templateItemId == null ||
        templateStateId == null ||
        etmProjectId == null ||
        etmStreamUrl == null
        // || H_RelevanceId == null
    ) {
        throw new Error("Not all information obtained to create testcase!")
    }

    const categories = [H_TestLevelId, H_TestCaseTypeId, H_RelevanceId]
    if (H_FuSa_QM_Id != null) categories.push(H_FuSa_QM_Id)

    const bodyParams = {
        itemType: "com.ibm.rqm.planning.TestCase",
        name: testCaseName,
        description: description,
        categories: categories.join(","),
        state: "com.ibm.rqm.planning.common.new",
        templateItemId: templateItemId,
        templateStateId: templateStateId,
        ownerIds: -1,
        customAttributesJson: [],
        weight: 100,
        isSingleTestCase: true,
        newTestCase: true,
        isWebUI: true,
        processArea: etmProjectId,
    }

    const bodyFrame = new URLSearchParams(bodyParams).toString()

    const url = new URL(`${etmHostContext}/service/com.ibm.rqm.planning.common.service.rest.ITestCaseRestService/testCaseDTO`)
    url.searchParams.append("oslc_config.context", etmStreamUrl)
    url.searchParams.append("webContext.projectArea", etmProjectId)

    const options = {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            accept: "text/json",
        },
        method: "POST",
        body: bodyFrame,
    }

    try {
        const res = await fetch(url, options)
        const data = await res.json()

        return data
    } catch (err) {
        throw err
    }
}

export function getH_TestLevelCategories(categoriesData) {
    const item = categoriesData.find((item) => item.name.trim() === company_TESTCASES_ATTRS.testLevel.title && item.externalURI === company_TESTCASES_ATTRS.testLevel.externalUrl)

    if (item == null || item?.categories == null || item?.itemId == null) {
        throw new Error(`Cannot find any Categories Data of Test Level in the current project`)
    }

    return [item.itemId, item.categories]
}

export async function handleLinkExistingTestCases(groupsWithExistingTestCases, DNGSpaceConfig) {
    const REQ_PER_TIME = 1

    const promiseHandler = async ({ requirementData, matchedTCs }) => {
        try {
            const existingTestCases = matchedTCs.map((item) => item.matchedTestCase)

            const [successList, failList] = await linkExistingTestCases({
                DNGSpaceConfig,
                existingTestCases,
                requirementData,
            })

            return {
                reqId: requirementData.id,
                successList,
                failList,
            }
        } catch (err) {
            throw err
        }
    }

    const linkExistingResponses = await fetchItemsInBatches(groupsWithExistingTestCases, REQ_PER_TIME, promiseHandler, null, null)
    return linkExistingResponses
}

async function linkExistingTestCases({ DNGSpaceConfig, existingTestCases, requirementData }) {
    const SLIDE_WIDTH = 5

    const existingVersionableItemURIs = [...new Set(existingTestCases.map((testCase) => testCase.rdfAbout))]

    const promiseHandler = (versionableItemURI) =>
        linkTestCaseToRequirement({
            DNGSpaceConfig,
            versionableItemURI,
            requirementData,
        })

    const linkExistingResponses = await fetchItemsInBatches(existingVersionableItemURIs, SLIDE_WIDTH, promiseHandler, null, null)

    return splitPromiseSettledResponses(linkExistingResponses)
}

export async function linkTestCaseToRequirement({ DNGSpaceConfig, versionableItemURI, requirementData }) {
    const { component, rawConfigPreset, configURI, hostContext } = DNGSpaceConfig

    const proxyUrl = new URL(`${hostContext}/proxy`)
    proxyUrl.searchParams.append("uri", versionableItemURI)

    try {
        await getLinkCache(requirementData, versionableItemURI, component.urlInProject, configURI, hostContext)
        const { xml, eTag } = await getLinkProxyXmlAndEtag(proxyUrl, rawConfigPreset, configURI)

        updateTcXmlToValidateReq(xml, requirementData, versionableItemURI)

        await putLinkProxy(proxyUrl, rawConfigPreset, configURI, xml, eTag)
        await postLinkCache(hostContext, requirementData.uri, versionableItemURI, component.urlInProject, JAZZ_LINK_SERVICE_TRACE_LINKS.validatedByRm, rawConfigPreset, configURI)

        const testCaseId = (getTag(IBM_XML_TAG_NAMES.oslcShortId, xml) || getTag(IBM_XML_TAG_NAMES.rqmShortId, xml))?.textContent.trim()

        return testCaseId
    } catch (err) {
        throw err
    }
}

function updateTcXmlToValidateReq(xml, requirementData, tcResourceUrl) {
    const validatesReqTag = xml.createElement(IBM_XML_TAG_NAMES.testCase.validateReq)
    validatesReqTag.setAttribute(IBM_XML_TAG_ATTRS.resource, requirementData.uri)
    validatesReqTag.setAttribute(IBM_XML_TAG_ATTRS.id, `oslc_rm_${requirementData.id}`)

    const mainDescTag = getTags(IBM_XML_TAG_NAMES.rdfDescription, xml.documentElement).find((descTag) => descTag.getAttribute(IBM_XML_TAG_ATTRS.about)?.startsWith(tcResourceUrl))
    mainDescTag?.appendChild(validatesReqTag)

    const reqDescTag = xml.createElement(IBM_XML_TAG_NAMES.rdfDescription)
    reqDescTag.setAttribute(IBM_XML_TAG_ATTRS.about, `#oslc_rm_${requirementData.id}`)
    
    const dctermTitleTag = xml.createElement("dcterms:title")
    dctermTitleTag.textContent = `${requirementData.id}: ${requirementData.primaryText.trim()}`
    reqDescTag.appendChild(dctermTitleTag)

    xml.documentElement.appendChild(reqDescTag)
}

async function getLinkCache(requirementData, tcResourceUrl, componentUrlInProject, configURI, hostContext) {
    const linkCacheUrl = new URL(`${hostContext}/linksCache`)
    linkCacheUrl.searchParams.append("sourceURL", requirementData.uri)
    linkCacheUrl.searchParams.append("targetURL", tcResourceUrl)
    linkCacheUrl.searchParams.append("typeURL", JAZZ_LINK_SERVICE_TRACE_LINKS.validatedByRm)

    try {
        const res = await fetch(linkCacheUrl, {
            headers: {
                Accept: "None",
                "Content-Type": "text/plain",
                "DoorsRP-Request-Type": "private",
                "net.jazz.jfs.owning-context": componentUrlInProject,
                "oslc.configuration": configURI,
                // [rawConfigPreset]: configURI,
            },
            method: "GET",
        })
    } catch (err) {
        throw err
    }
}
