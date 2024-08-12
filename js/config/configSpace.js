import { getTag, qs } from "../utils/helper.js"
import { IBM_XML_TAG_NAMES } from "./constants.js"

const GLOBAL_PRESET_CODE = "oslc_config.context"

function getConfigOptions() {
    return {
        headers: {
            Accept: "application/json",
            "OSLC-Core-Version": "2.0",
        },
    }
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

export function getConfigTypeAndURI(hash) {
    const urlParams = new URLSearchParams(hash)

    const configTypes = [
        {
            name: "vvc.configuration",
            preset: "vvc.configuration",
        },
        {
            name: "oslc.configuration",
            preset: "oslc_config.context",
        },
        {
            name: "oslc_config.context",
            preset: "oslc_config.context",
        },
        {
            name: "baselineURI",
            preset: "baselineURI",
        },
        {
            name: "snapshotId",
            preset: "snapshotId",
        },
    ]

    const currentConfigType = configTypes.find((type) => urlParams.has(type.name))

    if (currentConfigType == null) {
        return { configURI: null, configPreset: null, rawConfigPreset: null }
    }

    const configURI = urlParams.get(currentConfigType.name)
    const configPreset = currentConfigType.preset
    const rawConfigPreset = currentConfigType.name

    return { configURI, configPreset, rawConfigPreset }
}

export async function checkValidChangesetAtTime(hostContext, changesetURL) {
    const changesetInfoUrl = `${hostContext}/localVersioning/configurations/changesets?includeMergedFrom=true&uri=${changesetURL}`

    try {
        const res = await fetch(changesetInfoUrl, getConfigOptions())

        const data = await res.json()
        return data.state === "open"
    } catch (err) {
        return false
    }
}

export async function fetchConfigurations(hostContext, componentURI, configURI) {
    const componentUrl = `${hostContext}/cm/component/${componentURI}`

    const url = `${hostContext}/queryvvc/projectsinspace?space=${componentUrl}&includeDependency=true&oslc.configuration=${configURI}`
    const res = await fetch(url, getConfigOptions())
    const data = await res.json()

    return data
}

export async function fetchGlobalConfigurationData(globalConfigURL, changetsetURL = null) {
    try {
        const res = await fetch(globalConfigURL, getConfigOptions())
        if (res.status === 401) {
            throw new Error(`Auth required: You have not logged in to the GC project! Click this link to login: <a href="${globalConfigURL}" target="_blank">here</a> and try again!`)
        }
        
        const data = await res.json()

        return {
            globalConfigURL,
            changetsetURL,
            data,
        }
    } catch (err) {
        throw err
    }
}

export async function fetchViewHistory(hostContext, projectAreaUrl, componentURL) {
    const url = new URL(`${hostContext}/view-history`)
    url.searchParams.append("project", projectAreaUrl)
    url.searchParams.append("type", "com.ibm.team.configuration.web.globaltype")
    url.searchParams.append("type", "com.ibm.team.configuration.web.localtype")
    url.searchParams.append("uri2", componentURL)
    url.searchParams.append("size", 1.5)

    const res = await fetch(url, getConfigOptions())
    const data = await res.json()

    return data
}

export async function processConfigUrl({ hostContext, configURI, projectId, componentURI }) {
    if (configURI != null) return configURI

    const componentURL = `${hostContext}/cm/component/${componentURI.split("/").at(-1)}`
    const configData = await fetchViewHistory(hostContext, `${hostContext}/process/project-areas/${projectId}`, componentURL)
    return configData.items[0].uri
}
    
export async function processChangeset({ hostContext, changesetURL, componentURI, configURL }) {
    if (changesetURL != null) return changesetURL

    const configsInSpace = await fetchConfigurations(hostContext, componentURI, configURL)

    const configInSpace = configsInSpace?.items?.find((item) => item.url === componentURI)?.configurationUri
    return configInSpace?.includes("/changeset/") ? configInSpace : null
}

export function addEventsListenersForChangeset(callbackFunc, parentDocument = parent.document) {
    let timeoutRef = null
    const ressetTime = 150
    const pageContentNode = qs('[data-dojo-attach-point="contextManagementMenuNode"]', parentDocument)

    if (pageContentNode == null) return

    const mutateConfig = { attributes: true, childList: true, subtree: true }

    const contentNodeMutationObserver = new MutationObserver((mutationList) => {
        mutationList.forEach((mutation) => {
            if (mutation.target.matches("a.configurationUiNode") || mutation.target.matches("#configurationTitleNode") || mutation.target.matches("span.titleNode")) {
                if (timeoutRef != null) {
                    clearTimeout(timeoutRef)
                }

                timeoutRef = setTimeout(callbackFunc, ressetTime)
            }
        })
    })

    contentNodeMutationObserver.observe(pageContentNode, mutateConfig)
}

// Global configuration
export function isValidConfigurationAndChangeset({ checkConfig = true, configPreset = null, configURI = null, checkChangeset = true, changesetURL = null }) {
    const spaceErrors = []

    if (checkConfig && (configURI == null || configPreset !== GLOBAL_PRESET_CODE)) {
        spaceErrors.push("Please switch to a global configuration!")
    }

    if (checkChangeset && changesetURL == null) {
        spaceErrors.push("Please create/switch to a changeset!")
    }

    return { isValidSpace: spaceErrors.length === 0, spaceErrors }
}

export async function fetchSharedStreamsData(currentGlobalData) {
    const sharedStreamStr = "http://jazz.net/ns/config_ext#sharedStream"
    const derviedFromStr = "http://www.w3.org/ns/prov#wasDerivedFrom"
    let sharedStreamUrls

    if (currentGlobalData.data == null) {
        throw new Error("Failed to get global configuration data!")
    }

    if (currentGlobalData.changetsetURL == null) {
        if (currentGlobalData.data[currentGlobalData.globalConfigURL][sharedStreamStr] != null) sharedStreamUrls = currentGlobalData.data[currentGlobalData.globalConfigURL][sharedStreamStr].map((shared) => shared.value)
        else sharedStreamUrls = [currentGlobalData.globalConfigURL]
    } else {
        const foundData = currentGlobalData.data[currentGlobalData.globalConfigURL][sharedStreamStr] || currentGlobalData.data[currentGlobalData.globalConfigURL][derviedFromStr]
        if (foundData == null || foundData.length === 0) {
            alert("Failed to get shared streams in global configuration!")
            return []
        }
        sharedStreamUrls = foundData.map((shared) => shared.value)
    }

    try {
        const responses = await Promise.all(sharedStreamUrls.map((url) => fetch(url, getConfigOptions())))
        const data = await Promise.all(responses.map((res) => res.json()))
        return data
    } catch (err) {
        throw err
    }
}

export async function fetchStreamWithComponentsFromShared(sharedStreamData) {
    const configKey = "http://open-services.net/ns/config#configuration"

    const sharedComponentUrls = sharedStreamData
        .flatMap((shared) => {
            return Object.values(shared)
                .flatMap((value) => value[configKey])
                .filter((value) => value != null && value["value"].includes("oslc_config/resources/"))
        })
        .map((value) => value.value)

    try {
        const responses = await Promise.all(sharedComponentUrls.map((url) => fetch(url, getOslcOptions())))
        const needAuth = responses.find((res) => res.url.includes("/auth/authrequired"))?.url

        if (needAuth != null) {
            return {
                authRequired: true,
                data: needAuth,
            }
        }
        
        const texts = await Promise.all(responses.map((res) => res.text()))
        const domParser = new DOMParser()
        return {
            authRequired: false,
            data: texts.map((txt) => domParser.parseFromString(txt, "application/xml")),
        }
    } catch (err) {
        throw err
    }
}

export async function fetchReduceComponentsFromStreams(streamXmls) {
    const componentsData = streamXmls.reduce((urls, streamXml) => {
        const componentUrl = getTag(IBM_XML_TAG_NAMES.oslcConfigComponent, streamXml)?.getAttribute("rdf:resource")
        if (componentUrl == null) return urls

        const projectArea = getTag(IBM_XML_TAG_NAMES.projectArea, streamXml)?.getAttribute("rdf:resource")

        return {
            ...urls,
            [componentUrl]: {
                streamXmls: [...(urls[componentUrl]?.streamXmls || []), streamXml],
                projectArea,
            },
        }
    }, {})

    const domParser = new DOMParser()

    try {
        await Promise.all(
            Object.entries(componentsData).map(([key, value]) => {
                return new Promise((resolve) => {
                    const fetchComponent = async (componentUrl) => {
                        const res = await fetch(componentUrl, getOslcOptions())
                        const txt = await res.text()
                        const xml = domParser.parseFromString(txt, "application/xml")
                        const title = getTag(IBM_XML_TAG_NAMES.dctermsTitle, xml)?.textContent

                        value["title"] = title

                        resolve(xml)
                    }

                    fetchComponent(key).then(resolve)
                })
            })
        )

        return componentsData
    } catch (err) {
        alert(err)
        return null
    }
}
