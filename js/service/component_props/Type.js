import { findChildByTagName, toXml, xmlToString } from "../../utils/helper.js"
import { IBM_XML_TAG_ATTRS } from "../../config/constants.js"

const RDF_FRAME = `
    <rdf:RDF
        xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
        xmlns:rm="http://www.ibm.com/xmlns/rdm/rdf/"
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:dcterms="http://purl.org/dc/terms/"
        xmlns:jfs="http://jazz.net/xmlns/foundation/1.0/"
        xmlns:xs="http://www.w3.org/2001/XMLSchema#"
        xmlns:owl="http://www.w3.org/2002/07/owl#"
        xmlns:h="http://www.w3.org/TR/REC-html40"
    ></rdf:RDF>`

class Type {
    constructor(hostContext, componentUrlInProject, configUrl) {
        this.hostContext = hostContext
        this.componentUrlInProject = componentUrlInProject
        this.configUrl = configUrl

        this.fetchUrl = `${hostContext}/types`

        this.prefix = "rm"
        this.namespace
        this.tagName
        this.xml
        this.bodyXml
    }

    defineTagName() {
        this.tagName = `${this.prefix}:${this.namespace}`
    }

    createFetchConfig(method = "GET", body = "") {
        const options = {
            headers: {
                Accept: "None",
                "Content-Type": method === "GET" || method === "DELETE" ? "text/plain" : "application/rdf+xml",
                "DoorsRP-Request-Type": "private",
                "net.jazz.jfs.owning-context": decodeURIComponent(this.componentUrlInProject),
                "vvc.configuration": decodeURIComponent(this.configUrl),
                Referer: `${this.hostContext}/web`,
                "X-Requested-With": "XMLHttpRequest",
            },
            method,
        }

        if (method === "PUT" || method === "POST") {
            options.body = body
        }

        return options
    }

    createRdfDocument() {
        return toXml(RDF_FRAME)
    }

    createEntry(rdfDoc, tagName, text = "", attributes = {}) {
        const entry = rdfDoc.createElement(tagName)
        entry.textContent = text

        Object.entries(attributes).forEach(([key, value]) => {
            entry.setAttribute(key, value)
        })

        return entry
    }

    async create(docToCreate = "") {
        const contentToSend = xmlToString(docToCreate)

        try {
            const res = await fetch(this.fetchUrl, this.createFetchConfig("POST", contentToSend))

            if (res.status !== 201) {
                throw new Error("Failed to create type")
            }

            const text = await res.text()
            const xml = toXml(text)

            this.xml = xml
            this.bodyXml = findChildByTagName(this.tagName, this.xml.documentElement)

            return xml
        } catch (err) {
            throw err
        }
    }

    async update(updateURL, docToUpdate = "") {
        const contentToSend = xmlToString(docToUpdate)

        try {
            const res = await fetch(updateURL, this.createFetchConfig("PUT", contentToSend))

            if (res.status !== 200) {
                throw new Error("Failed to update type")
            }

            const text = await res.text()
            const xml = toXml(text)

            this.xml = xml
            this.bodyXml = findChildByTagName(this.tagName, this.xml.documentElement)

            return xml
        } catch (err) {
            throw err
        }
    }

    async populateXml(resourceURI) {
        const res = await fetch(resourceURI, this.createFetchConfig("GET"))
        const text = await res.text()
        const xml = toXml(text)

        this.xml = xml
        this.bodyXml = findChildByTagName(this.tagName, this.xml.documentElement)

        return this.xml
    }

    extractResourceURI() {
        if (this.xml == null) return null

        if (this.bodyXml == null) {
            this.bodyXml = findChildByTagName(this.tagName, this.xml.documentElement)
        }

        return this.bodyXml?.getAttribute(IBM_XML_TAG_ATTRS.about)
    }
}

export default Type
