import { getConfigTypeAndURI } from "./configSpace.js"

export function isModule() {
    if (!parent.window.location.hash.includes("showArtifactPage&artifactURI=")) return false

    const url = new URL(parent.window.location.origin + parent.window.location.hash.replace('#', '?'))
    const artifactURI = url.searchParams.get("artifactURI")
    return artifactURI?.split("/resources/")[1]?.startsWith('MD')
}   
            
export function isDNGApplication() {
    return location.pathname.includes("rm")
}

export function getProjectId(uri, locationHref) {
    const matched = uri.match(/%2Frm-projects%2F(\w+)(?:%2F)/)
    
    if (matched != null && matched.length > 1) return matched[1]
    const hashParams = locationHref.replace("#", "?")
    if (hashParams == null) return null
    const hashURL = new URL(hashParams)
    const componentURI = hashURL?.searchParams.get("componentURI")
    return componentURI?.split("/rm-projects/")?.[1].split("/")?.[0]
}

export function getURIs(rawHash) {
    const hash = decodeURIComponent(rawHash)

    const moduleURI = hash.split("artifactURI=")[1]?.split("&")[0].split("/").at(-1)
    const componentURI = hash.split("componentURI=")[1]?.split("&")[0]
    const changeset = hash.split("changeSet=")[1]
    const { configURI, configPreset, rawConfigPreset } = getConfigTypeAndURI(hash)

    return { moduleURI, componentURI, configURI, configPreset, rawConfigPreset, changeset }
}
