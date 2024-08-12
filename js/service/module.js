import { toXml, getTags, getTag, qsa, qs } from "../utils/helper.js"
import { IBM_XML_TAG_NAMES, IBM_XML_TAG_ATTRS } from "../config/constants.js"
import { isValidConfigurationAndChangeset } from "../config/configSpace.js"
import { SELECT_FIELD_URIS, queryArtifactsObjects } from "./artifact.js"

import { RmApi } from "../../libs/rmApi.js"

export const GLOBAL_PRESET_CODE = "oslc_config.context"

const rmClient = new RmApi()

function getFetchOptions(hostContext, isOslc = false) {
    const options = {
        referrer: `${hostContext}/web`,
        method: "GET",
        headers: {
            "OSLC-Core-Version": "2.0",
            Accept: "application/rdf+xml",
        },
    }

    return options
}

export async function getModuleBasicInfo(hostContext, moduleURI, configURI, configPreset, projectId) {
    const moduleFetchUrl = `${hostContext}/publish/modules?projectURI=${projectId}&moduleURI=${moduleURI}&${configPreset}=${configURI}`
    const moduleResponse = await fetch(moduleFetchUrl, getFetchOptions(hostContext))

    const text = await moduleResponse.text()
    const moduleXML = toXml(text)

    const title = getTag(IBM_XML_TAG_NAMES.rrm.title, moduleXML)?.textContent
    const description = getTag(IBM_XML_TAG_NAMES.rrm.desc, moduleXML)?.textContent
    const id = getTag(IBM_XML_TAG_NAMES.rrm.id, moduleXML)?.textContent
    const moduleType = getTag(IBM_XML_TAG_NAMES.attribute.objectType, moduleXML)?.getAttribute("attribute:name") || title
    const aboutURL = getTag(IBM_XML_TAG_NAMES.rrm.about, moduleXML)?.textContent
    const componentURI = getTag(IBM_XML_TAG_NAMES.rrm.about, getTag(IBM_XML_TAG_NAMES.ds.component, moduleXML))?.textContent.split("/").at(-1)

    const objectType = getTag(IBM_XML_TAG_NAMES.attribute.objectType, moduleXML)
    const moduleObjectTypeId = objectType?.getAttribute("attribute:itemId")
    const moduleTypeName = objectType?.getAttribute("attribute:name")

    const moduleRef = {
        uri: aboutURL,
        componentURI: `${hostContext}/rm-projects/${projectId}/components/${componentURI}`,
        moduleUri: null,
        format: "http://www.ibm.com/xmlns/rdm/types/ArtifactFormats#Module",
    }

    return { title, description, id, moduleType, moduleRef, moduleObjectTypeId, moduleTypeName }
}

export async function fetchArtIdsInView({ hostContext, currentViewURI, moduleURI, configPreset, configURI, projectId }) {
    const options = getFetchOptions(hostContext)

    const url = `${hostContext}/publish/views?moduleURI=${moduleURI}&${configPreset}=${configURI}&projectURI=${projectId}&viewURI=${currentViewURI}`
    const res = await fetch(url, options)

    const text = await res.text()
    const xml = toXml(text)

    const artifactTags = getTags(IBM_XML_TAG_NAMES.ds.artifact, xml)
    const artifactIds = artifactTags.map((tag) => getTag(IBM_XML_TAG_NAMES.rrm.id, tag)?.textContent)

    return artifactIds
}

// Views
function createFetchOptions({ hostContext, componentURI, configURI, isOslc = false }) {
    if (!isOslc) {
        return {
            headers: {
                "OSLC-Core-Version": "2.0",
                "DoorsRP-Request-Type": "private",
                Accept: "application/rdf+xml",
            },
            referrer: `${hostContext}/web`,
            method: "GET",
        }
    }

    return {
        headers: {
            "Content-Type": "text/plain",
            "Doorsrp-Request-Type": "private",
            Accept: "none",
            "X-Requested-With": "XMLHttpRequest",
            "Net.Jazz.Jfs.Owning-Context": componentURI,
            "oslc.configuration": configURI,
        },
        referrer: `${hostContext}/web`,
        method: "GET",
    }
}

async function getScopeArtifactType(hostContext, projectId, moduleURI, configPreset, configURI) {
    const oslcOptions = {
        referrer: `${hostContext}/web`,
        method: "GET",
        headers: {
            "OSLC-Core-Version": "2.0",
            Accept: "application/rdf+xml",
        },
    }

    const projectAreaUrl = `${hostContext}/process/project-areas/${projectId}`
    const url = `${hostContext}/resources/${moduleURI}?projectURL=${projectAreaUrl}&${configPreset}=${configURI}`
    const res = await fetch(url, oslcOptions)
    const text = await res.text()
    const xml = toXml(text)

    return getTag(IBM_XML_TAG_NAMES.oslc.instanceShape, xml)?.getAttribute(IBM_XML_TAG_ATTRS.resource)
}

export async function fetchModuleViewsWithPrivates({ hostContext, componentURI, moduleURI, projectId, configPreset, configURI }) {
    const oslcOptions = createFetchOptions({ hostContext, componentURI, configURI, isOslc: true })

    const module = `${hostContext}/resources/${moduleURI}`
    const projectAreaUrl = `${hostContext}/process/project-areas/${projectId}`
    const scopeArtifactType = await getScopeArtifactType(hostContext, projectId, moduleURI, configPreset, configURI)
    const userCreatedViewUrl = `${hostContext}/views?query=true&scope=module&processAreaContext=${projectAreaUrl}&module=${module}&scopeArtifactType=${scopeArtifactType}&creator=USER&${preventCache()}`
    let userCreatedViews = []

    try {
        const userCreatedViewRes = await fetch(userCreatedViewUrl, oslcOptions)
        const userCreatedViewText = await userCreatedViewRes.text()
        const userCreatedViewDoc = new DOMParser().parseFromString(userCreatedViewText, "application/xml")

        const results = qsa("entry content result", userCreatedViewDoc)

        userCreatedViews = results.map((result) => ({
            id: qs('binding[name="url"] uri', result)?.textContent.split("?")[0],
            uri: qs('binding[name="url"] uri', result)?.textContent,
            title: qs('binding[name="title"] literal', result)?.textContent,
            description: qs('binding[name="description"] literal', result)?.textContent,
            isShared: null,
            onlyForModule: qs('binding[name="scope"] literal', result)?.textContent.includes("module"),
            moduleScope: qs('binding[name="associatedModule"] uri', result)?.textContent,
            isPersonal: qs('binding[name="scope"] literal', result)?.textContent === "modulePrivate",
        }))
    } catch (err) {
        console.log(err)
        userCreatedViews = []
    } finally {
        return userCreatedViews
    }
}

export async function fetchModuleViews({ hostContext, componentURI, configURI, configPreset, changesetURL, moduleURI }) {
    const options = createFetchOptions({ hostContext, componentURI, configURI, isOslc: false })

    const url = `${hostContext}/views_oslc/query?componentURI=${componentURI}&${configPreset}=${changesetURL ? changesetURL : configURI}&moduleURI=${moduleURI}`
    let allViews

    try {
        const res = await fetch(url, options)
        const text = await res.text()
        const xml = toXml(text)

        allViews = getTags(IBM_XML_TAG_NAMES.view.viewDef, xml).map((viewXml) => ({
            id: viewXml.getAttribute(IBM_XML_TAG_ATTRS.about),
            uri: viewXml.getAttribute(IBM_XML_TAG_ATTRS.about),
            title: getTag(IBM_XML_TAG_NAMES.dctermsTitle, viewXml).textContent,
            description: getTag(IBM_XML_TAG_NAMES.dctermsDesc, viewXml).textContent,
            isShared: getTag(IBM_XML_TAG_NAMES.view.shared, viewXml),
            onlyForModule: getTag(IBM_XML_TAG_NAMES.view.applicability, viewXml).getAttribute(IBM_XML_TAG_ATTRS.resource).split("scope#")[1] === "module",
            moduleScope: getTag(IBM_XML_TAG_NAMES.view.scopedArtifact, viewXml)?.getAttribute(IBM_XML_TAG_ATTRS.resource),
        }))
    } catch (error) {
        console.log(error)
        allViews = []
    }

    return allViews
}

export async function getViewURIs({ hostContext, moduleURI, configURI, configPreset, componentURI, projectId = null, changesetURL = null }) {
    try {
        const [allViews, userCreatedViews] = await Promise.all([
            fetchModuleViews({ hostContext, changesetURL, componentURI, configPreset, configURI, moduleURI }),
            fetchModuleViewsWithPrivates({ configPreset, componentURI, configURI, hostContext, moduleURI, projectId })
        ])
        
        const views = allViews.filter((view) => (view.moduleScope == null || view.moduleScope.includes(moduleURI)) && view.onlyForModule)
        userCreatedViews.forEach((createdView) => {
            if (views.find((view) => view.id === createdView.id)) return
            views.push(createdView)
        })

        return views
    } catch (err) {
        throw err 
    }
}

export async function browseModule(state) {
    try {
        const { isValidSpace, spaceErrors } = isValidConfigurationAndChangeset({
            checkConfig: false,
            checkChangeset: true,
            changesetURL: state.changesetURL,
        })

        if (!isValidSpace) {
            throw new Error(spaceErrors.join("\n"))
        }

        const pickRes = await rmClient.showArtifactPicker()

        if (pickRes == null) {
            new Error("Something went wrong while choosing the artifact! Please try again!")
        }

        if (pickRes.code === "OPERATION_CANCELLED") return []

        if (pickRes.code !== "OK") {
            new Error("Something went wrong while choosing the artifact! Please try again!")
        }

        if (pickRes.data.length > 1) {
            new Error("Please choose ONLY one artifact!")
        }

        if (!pickRes.data[0].format.includes("ArtifactFormats#Module")) {
            new Error("Please choose a Module!")
        }

        if (pickRes.data[0].uri == null) {
            new Error("Failed to identify the module URI!")
        }

        return [pickRes.data[0].uri.split("/").at(-1), pickRes.data[0].componentUri]
    } catch (err) {
        throw err
    }
}

function preventCache() {
    const cacheNum = Math.floor(Math.random() * 10000000)
    return `dojo.preventCache=${cacheNum}`
}

export async function queryModuleArtifacts({ hostContext, moduleURI, componentUrlInProject, configURI, filter = {} }) {
    const queryFilteredData = await queryArtifactsObjects({
        params: {},
        select: [SELECT_FIELD_URIS.id, SELECT_FIELD_URIS.bookOrder, SELECT_FIELD_URIS.boundArtifact],
        where: {
            module: {
                moduleRdfURI: SELECT_FIELD_URIS.module,
                moduleResourceURI: `${hostContext}/resources/${moduleURI}`,
            },
            ...filter,
        },
        sort: [
            {
                rdfURI: SELECT_FIELD_URIS.bookOrder,
                orderBy: "asc",
            },
        ],
        fetchConfig: {
            componentURI: componentUrlInProject,
            configURI: configURI,
        },
        hostContext,
    })

    return queryFilteredData
}
