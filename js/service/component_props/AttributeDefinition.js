import Type from "./Type.js";
import { VALUE_TYPES_MAP } from "./typeMap.js";
import { IBM_XML_TAG_ATTRS } from '../../config/constants.js'

class AttributeDefinition extends Type {
    constructor(hostContext, componentUrlInProject, configUrl) {
        super(hostContext, componentUrlInProject, configUrl);
        
        this.prefix = "rm";
        this.namespace = "AttributeDefinition";
        this.defineTagName();
    }
    
    async createDoc(data) {
        const { title, dataTypeURI = "http://www.w3.org/2001/XMLSchema#string", owlSameAs = null } = data;

        const rdfDoc = this.createRdfDocument();
        const typeEntry = this.createEntry(rdfDoc, this.tagName, null, { [IBM_XML_TAG_ATTRS.about]: "" });
        rdfDoc.documentElement.appendChild(typeEntry);
        
        const titleEntry = this.createEntry(rdfDoc, "dcterms:title", title, {});
        typeEntry.appendChild(titleEntry);

        const rangeEntry = this.createEntry(rdfDoc, "rm:range", "", { [IBM_XML_TAG_ATTRS.resource]: dataTypeURI });
        typeEntry.appendChild(rangeEntry);

        const multiValuedEntry = this.createEntry(rdfDoc, "rm:multiValued", false, { "rdf:datatype": VALUE_TYPES_MAP.get("boolean") });
        typeEntry.appendChild(multiValuedEntry);

        const mandatoryEntry = this.createEntry(rdfDoc, "rm:mandatory", false, { "rdf:datatype": VALUE_TYPES_MAP.get("boolean") });
        typeEntry.appendChild(mandatoryEntry);

        if (owlSameAs != null && owlSameAs !== "") {
            const owlSameAsEntry = this.createEntry(rdfDoc, "owl:sameAs", "", { [IBM_XML_TAG_ATTRS.resource]: owlSameAs });
            typeEntry.appendChild(owlSameAsEntry);
        }

        this.xml = await this.create(rdfDoc);
    }
}

export default AttributeDefinition;
