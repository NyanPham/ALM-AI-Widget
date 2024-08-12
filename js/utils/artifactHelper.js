import { IBM_XML_TAG_ATTRS, IBM_XML_TAG_NAMES, BOUND_ARTIFACT_OBJ } from "../config/constants.js"
import { findChildByTagName, domParser, getTag, getTags } from "./helper.js"
import { ArtifactWithAI } from "../models/index.js"

export function buildArtifactTypeMapByResources(componentXml) {
    const objectTypes = getTags(IBM_XML_TAG_NAMES.rm.objectType, componentXml)
    const map = new Map()

    objectTypes.forEach((objType) => {
        const resourceURI = objType.getAttribute(IBM_XML_TAG_ATTRS.about)
        const type = findChildByTagName("dcterms:title", objType)?.textContent
        const typeRdfUri = findChildByTagName("owl:sameAs", objType)?.getAttribute("rdf:resource")

        map.set(resourceURI, {
            type,
            typeRdfUri,
        })
    })

    return map
}

export function createAndFilterArtifactAIs(arts, filterCb, { projectId, configPreset, artTypesMap, configURI, changesetURL, component }) {
    return arts
        .map(
            (art) =>
                new ArtifactWithAI({
                    id: art.id,
                    url: art.uri,
                    rawBaseArtXml: art[BOUND_ARTIFACT_OBJ],
                    projectId,
                    configURI,
                    configPreset,
                    changesetURL,
                    artTypesMap,
                    componentUrlInProject: component.urlInProject,
                })
        )
        .filter(filterCb)
}

export function getArtsTagsInView({ artifacts, artIdsInView }) {
    return artIdsInView != null && Array.isArray(artIdsInView)
        ? artifacts.filter((art) => {
              return artIdsInView.includes(art.id)
          })
        : artifacts
}

export function filterRequirementsFromArtifacts(artifacts, artTypesMap) {
    return artifacts.reduce((requirementList, art) => {
        const baseArtXml = domParser.parseFromString(art[BOUND_ARTIFACT_OBJ], "application/xml")
        const artType = artTypesMap.get(getTag(IBM_XML_TAG_NAMES.rm.ofType, baseArtXml)?.getAttribute("rdf:resource"))

        if (!artType?.type?.toLowerCase().includes("requirement") && !artType?.type?.toLowerCase().includes("req")) return requirementList

        const primaryTextTag = getTags(IBM_XML_TAG_NAMES.rdfValue, baseArtXml.documentElement).find((valueRdf) => valueRdf.getAttribute("rdf:parseType") === "Literal")
        const primaryText = primaryTextTag != null ? primaryTextTag.textContent : ""

        art.primaryText = primaryText
        art.type = artType?.type
        art.typeRdfUri = artType?.typeRdfUri

        return [...requirementList, art]
    }, [])
}

export function extractPrimaryTextAndSimplifyArtifactObjects(artifacts, { getTestLevel = false, artTypesMap = null } = {}) {
    return artifacts.reduce((requirementList, art) => {
        const baseArtXml = domParser.parseFromString(art[BOUND_ARTIFACT_OBJ], "application/xml")
        const primaryTextTag = getTags(IBM_XML_TAG_NAMES.rdfValue, baseArtXml.documentElement).find((valueRdf) => valueRdf.getAttribute("rdf:parseType") === "Literal")
        const primaryText = primaryTextTag != null ? primaryTextTag.textContent : ""
        
        if (getTestLevel) {
            const artType = artTypesMap.get(getTag(IBM_XML_TAG_NAMES.rm.ofType, baseArtXml)?.getAttribute("rdf:resource"))
            const typeRdfUri = artType?.typeRdfUri

            return [
                ...requirementList,
                {
                    id: art.id,
                    uri: art.uri,
                    primaryText,
                    typeRdfUri,
                },
            ]
        }

        return [
            ...requirementList,
            {
                id: art.id,
                uri: art.uri,
                primaryText,
            },
        ]
    }, [])
}
