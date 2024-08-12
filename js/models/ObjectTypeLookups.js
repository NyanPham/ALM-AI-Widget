import { findChildByTagName } from "../utils/helper.js"
import { IBM_XML_TAG_ATTRS } from '../config/constants.js'
const DCTERMS_TITLE_TAG_NAME = "dcterms:title"
const OWL_SAMEAS_TAG_NAME = "owl:sameAs"



export const lookupFunctions = {
    buildTypeLookupTables() {
        const { lookupByResource, lookupByTitle, lookupByOwlSameAs, workflowLookupByResource } = [...this.xml.documentElement.children].reduce(
            (lookupTables, child) => {
                const workflow = findChildByTagName("rm:workflow", child)

                if (workflow?.textContent.trim() === "true") {
                    if (child.tagName !== "rm:AttributeType") return lookupTables
                    const resourceUrl = child.getAttribute(IBM_XML_TAG_ATTRS.about)

                    return {
                        ...lookupTables,
                        workflowLookupByResource: {
                            ...lookupTables.workflowLookupByResource,
                            [resourceUrl]: child,
                        },
                    }
                }

                const resourceUrl = child.getAttribute(IBM_XML_TAG_ATTRS.about)
                const title = findChildByTagName(DCTERMS_TITLE_TAG_NAME, child)?.textContent
                const owlSameAs = findChildByTagName(OWL_SAMEAS_TAG_NAME, child)?.getAttribute(IBM_XML_TAG_ATTRS.resource)

                return {
                    ...lookupTables,
                    lookupByResource: {
                        ...lookupTables.lookupByResource,
                        [resourceUrl]: child,
                    },
                    lookupByTitle: {
                        ...lookupTables.lookupByTitle,
                        [title]: child,
                    },
                    lookupByOwlSameAs: {
                        ...lookupTables.lookupByOwlSameAs,
                        [owlSameAs]: owlSameAs != null ? child : null,
                    },
                }
            },
            { lookupByResource: {}, lookupByTitle: {}, lookupByOwlSameAs: {}, workflowLookupByResource: {} }
        )

        this.selfTypesLookupTable = lookupByResource
        this.selfTypesLookupTableByTitle = lookupByTitle
        this.selfTypesLookupTableByOwlSameAs = lookupByOwlSameAs
        this.workflowLookupByResource = workflowLookupByResource
        this.typesToRemoveLookup = {}
    },
}
