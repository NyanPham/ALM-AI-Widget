import { IBM_XML_TAG_NAMES } from "../config/constants.js"
import { domParser, getTags, getTag } from "../utils/helper.js"
import Artifact from "./Artifact.js"

const RDF_VALUE_LITERAL_TAGNAME = "rdf:value"

class ArtifactForTestCases extends Artifact {
    constructor({ id, url, rawBaseArtXml, projectId, configURI, configPreset, changesetURL, artTypesMap }) {
        super(null, projectId, configURI, configPreset, changesetURL)

        this.id = id
        this.url = url
        this.rawBaseArtXml = rawBaseArtXml
        this.artTypesMap = artTypesMap

        this.initTypeAndPrimaryText()
    }

    initTypeAndPrimaryText() {
        if (this.rawBaseArtXml) {
            const baseArtXml = domParser.parseFromString(this.rawBaseArtXml, "application/xml")
            const primaryTextTag = getTags(RDF_VALUE_LITERAL_TAGNAME, baseArtXml.documentElement).find((valueRdf) => valueRdf.getAttribute("rdf:parseType") === "Literal")

            this.primaryText = primaryTextTag != null ? primaryTextTag.textContent : null
            this.type = this.artTypesMap.get(getTag(IBM_XML_TAG_NAMES.rm.ofType, baseArtXml)?.getAttribute(IBM_XML_TAG_ATTRS.resource))?.type
        } else {
            this.primaryText = null
        }
    }
}

export default ArtifactForTestCases
