import { toXml } from "../utils/helper.js"
import { lookupFunctions } from "./ObjectTypeLookups.js"

class Component {
    constructor(component, config, hostContext) {
        this.name = component.name
        this.url = component.url
        this.urlInProject = component.urlInProject
        this.config = config
        this.hostContext = hostContext
        this.xml = null
        this.linkConstraintsXml = null
        this.linkConstraintsData = null

        this.selfTypesLookupTable = {}
        this.selfTypesLookupTableByTitle = {}
        this.selfTypesLookupTableByOwlSameAs = {}

        this.updatedEnumEntriesList = []
        this.progressItems = []

        this.typesToRemoveLookup = {}
    }

    createFetchConfig(method = "GET", body = "") {
        const options = {
            headers: {
                Accept: "None",
                "Content-Type": method === "GET" || method === "DELETE" ? "text/plain" : "application/rdf+xml",
                "DoorsRP-Request-Type": "private",
                "net.jazz.jfs.owning-context": decodeURIComponent(this.urlInProject),
                "vvc.configuration": decodeURIComponent(this.config.url),
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

    async fetchComponentObjectType() {
        const url = new URL(`${this.hostContext}/types`)
        url.searchParams.append("resourceContext", decodeURIComponent(this.urlInProject))
        url.searchParams.append("configurationUri", decodeURIComponent(this.config.url))

        try {
            const res = await fetch(url.href, this.createFetchConfig())

            if (!res.ok) {
                const error = await res.json();
                
                return {
                    status: "fail",
                    error,
                }
            }

            const text = await res.text()
            const xml = toXml(text)

            this.xml = xml
            if (this.buildTypeLookupTables != null && typeof this.buildTypeLookupTables === "function") {
                this.buildTypeLookupTables()
            }

            return {
                status: "success",
                data: this.xml,
            }
        } catch (err) {
            throw err
        }
    }
}

Object.assign(Component.prototype, lookupFunctions)
export default Component
