import { processChangeset, processConfigUrl } from "../config/configSpace.js"
import { createXmlOptions, getTag, getTags, toXml, qsa, findChildrenByTagName } from "../utils/helper.js"
import { REQ_PER_TIME, STRING_DATA_TYPE_RDF_URI, ATTRIBUTE_TAG_NAME, ARTIFACT_TYPE_TAG_NAME, ATTR_RDF_URI_DOMAIN, IBM_XML_TAG_NAMES, IBM_XML_TAG_ATTRS } from "../config/constants.js"
import { ObjectType, AttributeDefinition } from "./component_props/index.js"
import { fetchItemsInBatches } from "../utils/fetchHelper.js"

export async function processCurrentComponentPage(componentURI) {
    try {
        const res = await fetch(componentURI, createXmlOptions())
        const text = await res.text()
        const xml = toXml(text)

        const componentsFetchUrl = getTag(IBM_XML_TAG_NAMES.dng.components, xml)?.textContent
        const { url, name } = await fetchCMComponentUrl(componentsFetchUrl, componentURI)
        const component = {
            name,
            url,
            urlInProject: componentURI,
        }

        const componentNameEls = qsa(`[data-component-name="target"]`)

        componentNameEls.forEach((el) => {
            el.innerText = component.name
            el.dataset.component = JSON.stringify(component)
            el.dataset.componentUrl = component.url
        })

        return component
    } catch (err) {
        throw err
    }
}

export async function processConfigAndChangeset({ changesetURL, componentURI, configURL, projectId, hostContext }) {
    try {
        let newConfigURL = await processConfigUrl({ hostContext, configURI: configURL, projectId, componentURI })
        let newChangesetURL = await processChangeset({ hostContext, changesetURL, componentURI, configURL: newConfigURL })

        return { configURL: newConfigURL, changesetURL: newChangesetURL }
    } catch (err) {
        throw err
    }
}

async function fetchCMComponentUrl(componentsFetchInProject, componentUrlInProject) {
    try {
        const res = await fetch(componentsFetchInProject, createXmlOptions())
        const text = await res.text()
        const xml = toXml(text)

        const allComponentAreas = getTags(IBM_XML_TAG_NAMES.dng.projectArea, xml)
        const componentArea = allComponentAreas.find((area) => getTag(IBM_XML_TAG_NAMES.dng.url, area)?.textContent === componentUrlInProject)

        return {
            url: getTag(IBM_XML_TAG_NAMES.oslcConfigComponent, componentArea)?.textContent,
            name: componentArea.getAttribute("jp06:name"),
        }
    } catch (err) {
        throw err
    }
}

export async function checkAndCreateMissingAttributes(customAttrs, renderer, component) {
    const promiseHandler = async (attrName) => {
        return checkCustomAttributes(renderer, component, {
            attributeName: attrName,
            attributeRDFURI: `${ATTR_RDF_URI_DOMAIN}${attrName}`,
        })
    }
    
    await fetchItemsInBatches(customAttrs, REQ_PER_TIME, promiseHandler, null, null)
    renderer.loadingLayer.hide()
}

export async function checkCustomAttributes(renderer, component, { attributeName, attributeRDFURI, targetArtTypes = null }) {
    if (component == null) return false
    if (component.xml == null) {
        await component.fetchComponentObjectType()
    }

    if (component.xml == null) return false

    renderer.loadingLayer.show(`Checking Attribute ${ATTR_RDF_URI_DOMAIN}${attributeName}`)

    const attributeTags = findChildrenByTagName(ATTRIBUTE_TAG_NAME, component.xml.documentElement)
    const attrEntry = attributeTags.find((tag) => getTag(IBM_XML_TAG_NAMES.owlSameAs, tag)?.getAttribute(IBM_XML_TAG_ATTRS.resource) === attributeRDFURI)

    if (attrEntry != null) {
        return attrEntry.getAttribute(IBM_XML_TAG_ATTRS.about)
    }

    const artTypeTags = findChildrenByTagName(ARTIFACT_TYPE_TAG_NAME, component.xml.documentElement)
    
    const attrDef = await createTextType(component, {
        title: attributeName,
        owlSameAs: attributeRDFURI,
    })

    const resourceURI = attrDef.extractResourceURI()
    await addAttributeToArtifactTypes(component, artTypeTags, resourceURI, targetArtTypes)
    await component.fetchComponentObjectType()

    return resourceURI
}

async function addAttributeToArtifactTypes(component, artifactTypeTags, attributeResourceURI, targetArtTypes = null) {
    // const targetArtTypeTags =
    //     targetArtTypes != null
    //         ? artifactTypeTags.filter((typeTag) => {
    //               const artTypeTitle = getTag(IBM_XML_TAG_NAMES.dctermsTitle, typeTag)?.textContent?.trim().toLowerCase()
    //               return targetArtTypes.some((targetType) => artTypeTitle.includes(targetType.toLowerCase()))
    //           })
    //         : artifactTypeTags

    const promiseHandler = async (artType) => {
        const artTypeURI = artType.getAttribute(IBM_XML_TAG_ATTRS.about)

        const objectType = new ObjectType(component.hostContext, component.urlInProject, component.config.url)
        await objectType.populateXml(artTypeURI)
        await objectType.addNewAttribute(attributeResourceURI)

        return objectType
    }

    await fetchItemsInBatches(artifactTypeTags, REQ_PER_TIME, promiseHandler, null, null)
}

async function createTextType(component, { title, owlSameAs, dataTypeURI = STRING_DATA_TYPE_RDF_URI }) {
    const attrDef = new AttributeDefinition(component.hostContext, component.urlInProject, component.config.url)
    try {
        await attrDef.createDoc({
            title,
            dataTypeURI,
            owlSameAs,
        })

        return attrDef
    } catch (err) {
        console.log(err)
        throw err
    }
}

export async function createArtifactType(component, { title, owlSameAs }) {
    const artType = new ObjectType(component.hostContext, component.urlInProject, component.config.url)

    try {
        await artType.createDoc({
            title,
            owlSameAs,
        })

        return artType
    } catch (err) {
        console.error(err)
        throw err
    }
}
