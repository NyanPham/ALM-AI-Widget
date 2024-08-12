import Type from "./Type.js"
import { IBM_XML_TAG_ATTRS } from "../../config/constants.js"

class ObjectType extends Type {
    constructor(hostContext, componentUrlInProject, configUrl) {
        super(hostContext, componentUrlInProject, configUrl)

        this.prefix = "rm"
        this.namespace = "ObjectType"
        this.defineTagName()
    }

    async addNewAttribute(attrDefUri) {
        if (this.xml == null || this.bodyXml == null) return
        const hasAttrEntry = this.createAttributeEntry(attrDefUri)

        this.bodyXml.appendChild(hasAttrEntry)
        const updateURL = this.bodyXml.getAttribute(IBM_XML_TAG_ATTRS.about)

        await this.update(updateURL, this.xml.documentElement)
    }

    createAttributeEntry(attrDefUri) {
        const hasAttributeEntry = this.xml.createElement("rm:hasAttribute")
        hasAttributeEntry.setAttribute("rdf:resource", attrDefUri)

        return hasAttributeEntry
    }

    async createDoc({ title, owlSameAs }) {
        if (title == null || owlSameAs == null) {
            throw new Error("Title and RDF URI must be specified!")
        }

        const rdfDoc = this.createRdfDocument()
        const typeEntry = this.createEntry(rdfDoc, this.tagName, null, { [IBM_XML_TAG_ATTRS.about]: "" })
        rdfDoc.documentElement.appendChild(typeEntry)

        const titleEntry = this.createEntry(rdfDoc, "dcterms:title", title, {})
        typeEntry.appendChild(titleEntry)

        if (owlSameAs != null && owlSameAs !== "") {
            const owlSameAsEntry = this.createEntry(rdfDoc, "owl:sameAs", "", { "rdf:resource": owlSameAs })
            typeEntry.appendChild(owlSameAsEntry)
        }

        console.log(rdfDoc)

        this.xml = await this.create(rdfDoc)
    }
}

export default ObjectType
