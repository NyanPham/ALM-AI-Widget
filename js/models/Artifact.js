import { IBM_XML_TAG_NAMES, IBM_XML_TAG_ATTRS } from "../config/constants.js"
import { createXmlOptions, getTag, xmlSerializer } from "../utils/helper.js"

class Artifact {
    constructor(artMemberEntry, projectId, configURI, configPreset, changesetURL) {
        this.xml = artMemberEntry
        this.configURI = configURI
        this.configPreset = configPreset
        this.projectId = projectId
        this.changesetURL = changesetURL
        this.oslcArtifactXml = null

        if (artMemberEntry != null) {
            this.id = getTag(IBM_XML_TAG_NAMES.dctermsId, this.xml)?.textContent
            this.url = this.xml.getAttribute(IBM_XML_TAG_ATTRS.about)?.split("?")[0]
        }

        this.base = false
        this.type = "Artifact"
    }

    static domParser = new DOMParser()

    constructHref({ withChangeset = true }) {
        if (withChangeset) return `${this.url}?projectURI=${this.projectId}&${this.configPreset}=${this.changesetURL != null ? this.changesetURL : this.configURI}`
        else return `${this.url}?projectURI=${this.projectId}&${this.configPreset}=${this.configURI}`
    }

    fetchOslcXml({ withChangeset = false, getEtag = false } = null) {
        return new Promise(async (resolve, reject) => {
            let artifactUrl

            if (withChangeset) {
                artifactUrl = `${this.url}?projectURI=${this.projectId}&${this.configPreset}=${this.changesetURL != null ? this.changesetURL : this.configURI}`
            } else {
                artifactUrl = `${this.url}?projectURI=${this.projectId}&${this.configPreset}=${this.configURI}`
            }

            const res = await fetch(artifactUrl, createXmlOptions())
            const etag = res.headers.get("etag")

            const text = await res.text()
            this.oslcArtifactXml = Artifact.domParser.parseFromString(text, "text/xml")

            if (!getEtag) {
                resolve(this.oslcArtifactXml)
            }

            resolve({
                artifactXml: this.oslcArtifactXml,
                etag,
                artifactUrl,
            })
        })
    }

    async updateThisArtifact(newArtifactXml, etag) {
        if (this.changesetURL == null) {
            alert("Something is wrong with the changeset! The transfer is blocked automatically!")
            return false
        }
        
        const artifactUrl = `${this.url}?projectURI=${this.projectId}&${this.configPreset}=${this.changesetURL != null ? this.changesetURL : this.configURI}`

        const contentToSend = xmlSerializer.serializeToString(newArtifactXml)

        const updateOptions = {
            headers: {
                "OSLC-Core-Version": "2.0",
                "Content-Type": "application/rdf+xml",
                "If-Match": etag,
            },
            method: "PUT",
            referrer: `${this.hostContext}/web`,
            body: contentToSend,
        }

        const updateRes = await fetch(artifactUrl, updateOptions)

        if (!updateRes.ok && updateRes.status == 412 && updateRes.statusText === "Precondition Failed") {
            return false
        } else if (!updateRes.ok) {
            const text = await updateRes.text()
            console.error(text)

            return false
        } else {
            this.attributesTransfered = true
        }

        return true
    }
}

export default Artifact
