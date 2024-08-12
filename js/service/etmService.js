import { fetchItemsInBatches } from "../utils/fetchHelper.js"
import { domParser, getTag, getTags, toXml, xmlSerializer } from "../utils/helper.js"
import renderer from "../view/Renderer.js"
import { IBM_XML_TAG_NAMES, IBM_XML_TAG_ATTRS } from "../config/constants.js"

export async function fetchTestCasesAndStreamDataFromComponent({ selectedComponent, etmStreamURL, etmComponentURL, abortHandler }) {
    try {
        const etmStreamsData = selectedComponent.streamXmls
            .map((streamXml) => ({
                url: getTag(IBM_XML_TAG_NAMES.rdfDescription, streamXml)?.getAttribute(IBM_XML_TAG_ATTRS.about).split("/").at(-1),
                title: getTag(IBM_XML_TAG_NAMES.dctermsTitle, streamXml)?.textContent,
                fullStreamUrl: getTag(IBM_XML_TAG_NAMES.rdfDescription, streamXml)?.getAttribute(IBM_XML_TAG_ATTRS.about),
            }))
            .filter((item) => (etmStreamURL == null ? true : item.fullStreamUrl === etmStreamURL))

        const qmQueryData = await fetchTestCasesDataFromComponent(etmComponentURL, etmStreamsData, abortHandler)

        if (qmQueryData == null || !Array.isArray(qmQueryData)) {
            throw new Error("Failed to get qmQueryData")
        }

        if (qmQueryData.length === 0) {
            throw new Error("No Query Data of test cases found!")
        }

        const testCases = qmQueryData.flatMap((testCasesXmls) => {
            return testCasesXmls.flatMap((xml) => {
                const rdfs = getTags(IBM_XML_TAG_NAMES.rdfDescription, xml)
                const tags = rdfs.filter((rdf) => {
                    return rdf.getAttribute(IBM_XML_TAG_ATTRS.about) != null && getTag(IBM_XML_TAG_NAMES.oslcPagination.next, rdf) == null && getTag(IBM_XML_TAG_NAMES.rdfType, rdf)?.getAttribute("rdf:resource").endsWith("qm#TestCase")
                })

                return tags.reduce((filtered, tag) => {
                    return tag == null ? filtered : [...filtered, tag]
                }, [])
            })
        })

        return { testCases, etmStreamsData }
    } catch (err) {
        throw err
    }
}

async function fetchTestCasesDataFromComponent(componentUrl, etmStreamsData, abortHandler) {
    try {
        const componentDataRes = await fetch(componentUrl, getOslcOptions())
        const componentDataText = await componentDataRes.text()
        const componentDataXml = domParser.parseFromString(componentDataText, "text/xml")

        const emtProjectArea = componentDataXml.getElementsByTagName("process:projectArea")[0]?.getAttribute(IBM_XML_TAG_ATTRS.resource)
        const etmProjectId = emtProjectArea?.split("/").at(-1)
        const etmHostContext = emtProjectArea?.split("/process/project-areas/")[0]
        const IBM_TESTCASE_URL_COMPONENT = "com.ibm.rqm.planning.VersionedTestCase"
        const testCaseBaseUrl = `${etmHostContext}/oslc_qm/contexts/${etmProjectId}/resources/${IBM_TESTCASE_URL_COMPONENT}`

        return fetchTestCaseXmls(testCaseBaseUrl, etmStreamsData, abortHandler)
    } catch (err) {
        throw err
    }
}

const fetchTCXml = async (testCaseBaseUrl, streamData, page, queryPageSize = 512) => {
    const testCasesRequestUrl = new URL(`${testCaseBaseUrl}?oslc_config.context=${streamData.url}`)
    testCasesRequestUrl.searchParams.append("oslc.paging", true)
    testCasesRequestUrl.searchParams.append("oslc.pageSize", queryPageSize)
    testCasesRequestUrl.searchParams.append("oslc.select", "oslc:shortId,dcterms:title,dcterms:description,oslc_qm:validatesRequirement,oslc_config:component,rqm_qm:category")

    if (testCasesRequestUrl.searchParams.has("rqm_qm.pageNum")) {
        testCasesRequestUrl.searchParams.delete("rqm_qm.pageNum")
    }

    testCasesRequestUrl.searchParams.append("rqm_qm.pageNum", page)
    const testCasesRes = await fetch(testCasesRequestUrl.href, getOslcOptions())

    const testCasesText = await testCasesRes.text()
    const testCasesXml = domParser.parseFromString(testCasesText, "text/xml")

    return testCasesXml
}

async function fetchTestCaseXmls(testCaseBaseUrl, etmStreamsData, abortHandler) {
    const QUERY_PAGE_SIZE = 512
    const QUERY_PAGES_PER_TIME = 3

    try {
        const qmQueryData = await Promise.all(
            etmStreamsData.map((streamData) => {
                return new Promise(async (resolve, reject) => {
                    const testCasesXmls = []

                    const initialTestCasesXml = await fetchTCXml(testCaseBaseUrl, streamData, 0, QUERY_PAGE_SIZE)
                    testCasesXmls.push(initialTestCasesXml)

                    const pageTotal = getTestCasesTotal(initialTestCasesXml, QUERY_PAGE_SIZE)
                    const navPageNums = Array.from({ length: pageTotal - 1 }, (_, i) => i + 1)

                    if (pageTotal == null || pageTotal === 1) {
                        resolve(testCasesXmls)
                    }

                    renderer.loadingLayer.setProgress(0)
                    renderer.loadingLayer.showProgress()

                    const promiseHandler = async (pageNum) => {
                        return fetchTCXml(testCaseBaseUrl, streamData, pageNum, QUERY_PAGE_SIZE)
                    }

                    const progressHandler = ({ batchResponses, currentIndex, totalIndices }) => {
                        batchResponses.forEach((res) => {
                            if (res.status !== "fulfilled") reject(res.reason)

                            testCasesXmls.push(res.value)
                        })

                        const progress = ((currentIndex / totalIndices) * 100).toFixed(2)
                        renderer.updateProgress(progress)

                        if (progress >= 100) {
                            renderer.loadingLayer.show("Filtering non-validated requirements...")
                        }
                    }

                    await fetchItemsInBatches(navPageNums, QUERY_PAGES_PER_TIME, promiseHandler, progressHandler, abortHandler)

                    resolve(testCasesXmls)
                })
            })
        )

        return qmQueryData
    } catch (err) {
        throw err
    } finally {
        renderer.loadingLayer.setProgress(0)
        renderer.loadingLayer.hideProgress()
    }
}

function getTestCasesTotal(testCasesXml, QUERY_PAGE_SIZE) {
    const nextPageTags = testCasesXml.getElementsByTagName(IBM_XML_TAG_NAMES.oslcPagination.next)

    if (nextPageTags?.length > 0) {
        const totalTestCases = nextPageTags[0]?.parentNode?.getElementsByTagName("oslc:totalCount")[0]?.textContent?.trim()
        if (totalTestCases != null) {
            return Math.ceil(parseInt(totalTestCases) / QUERY_PAGE_SIZE)
        }
    }

    return null
}

function getOslcOptions() {
    return {
        headers: {
            "OSLC-Core-Version": "2.0",
            "DoorsRP-Request-Type": "private",
            Accept: "application/rdf+xml",
        },
        method: "GET",
    }
}

export async function getTCCategoriesData({ etmProjectId = null, etmHostContext = null, etmStreamUrl = null }) {
    if (etmProjectId == null || etmHostContext == null || etmStreamUrl == null) {
        throw new Error("Could not get enough information to get categories: ETM project ID, ETM app host, ETM stream")
    }

    const url = new URL(`${etmHostContext}/service/com.ibm.rqm.planning.common.service.rest.ICategoryTypeRestService/categoryTypesDTO?itemType=TestCase`)
    url.searchParams.append("resolveCategories", "PAGE")
    url.searchParams.append("processAreaUUID", etmProjectId)
    url.searchParams.append("isNotPurged", false)
    url.searchParams.append("includeGlobal", true)
    url.searchParams.append("oslc_config.context", etmStreamUrl)
    url.searchParams.append("webContext.projectArea", etmProjectId)

    try {
        const res = await fetch(url, {
            headers: {
                accept: "text/json",
                "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            },
            method: "GET",
        })

        const data = await res.json()
        const values = data?.["soapenv:Body"]?.response?.returnValue?.values

        return values
    } catch (err) {
        throw err
    }
}

export async function getTemplateItemId({ etmHostContext, etmProjectId, etmStreamUrl }) {
    // TODO: Need to take a look at the which template should it use:
    // current knowledge: manual vs automatic template

    const url = new URL(`${etmHostContext}/service/com.ibm.rqm.template.common.service.ITemplateRestService/templates`)
    url.searchParams.append("editorId", "com.ibm.rqm.planning.editor.testcase")
    url.searchParams.append("includeSections", false)
    url.searchParams.append("processAreaUUID", etmProjectId)
    url.searchParams.append("oslc_config.context", etmStreamUrl)
    url.searchParams.append("webContext.projectArea", etmProjectId)

    try {
        const res = await fetch(url, {
            headers: {
                accept: "text/json",
                "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            },
        })

        const data = await res.json()
        const value = data?.["soapenv:Body"]?.response?.returnValue?.values[1]

        return {
            templateItemId: value?.itemId,
            templateStateId: value?.stateId,
        }
    } catch (err) {
        throw err
    }
}

export async function getLinkProxyXmlAndEtag(proxyUrl, rawConfigPreset, configURI) {
    try {
        const res = await fetch(proxyUrl, {
            headers: {
                "OSLC-Core-Version": "2.0",
                "DoorsRP-Request-Type": "private",
                Accept: "application/rdf+xml",
                [rawConfigPreset]: configURI,
                "Configuration-Context": configURI,
            },
            method: "GET",
        })
        const eTag = res.headers.get("ETag")

        const text = await res.text()
        const xml = toXml(text)

        return { xml, eTag }
    } catch (err) {
        throw err
    }
}

export async function putLinkProxy(proxyUrl, rawConfigPreset, configURI, xml, eTag) {
    try {
        const res = await fetch(proxyUrl, {
            headers: {
                "OSLC-Core-Version": "2.0",
                "DoorsRP-Request-Type": "private",
                Accept: "text/xml",
                "Content-Type": "application/rdf+xml",
                [rawConfigPreset]: configURI,
                "Configuration-Context": configURI,
                "If-Match": eTag,
            },
            method: "PUT",
            body: xmlSerializer.serializeToString(xml),
        })

        if (res.status == 412) {
            console.log(proxyUrl)
        }
    } catch (err) {
        console.error(err)

        throw err
    }
}

export async function postLinkCache(hostContext, requirementURI, tcResourceUrl, componentUrlInProject, typeUrl, rawConfigPreset, configURI) {
    const linkCacheUrl = new URL(`${hostContext}/linksCache`)
    linkCacheUrl.searchParams.append("sourceURL", requirementURI)
    linkCacheUrl.searchParams.append("targetURL", tcResourceUrl)
    linkCacheUrl.searchParams.append("typeURL", typeUrl)
    linkCacheUrl.searchParams.append("action", "create")

    try {
        await fetch(linkCacheUrl, {
            headers: {
                Accept: "None",
                "Content-Type": "text/plain",
                "DoorsRP-Request-Type": "private",
                "net.jazz.jfs.owning-context": componentUrlInProject,
                "oslc.configuration": configURI,
                // [rawConfigPreset]: configURI,
            },
            method: "POST",
        })
    } catch (err) {
        throw err
    }
}
