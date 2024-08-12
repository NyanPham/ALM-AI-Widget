let instance = null

export const host = parent.window.location.origin
export const appContext = parent.window.location.pathname.split("/").at(1)
export const hostContext = `${host}/${appContext}`
export const referfer = `${hostContext}/web`
export const location = parent.window.location

class State {
    constructor() {
        if (instance != null) {
            alert("state can only have one instance")
            return
        }

        instance = this
        this.reset()
    }

    reset() {
        this.projectId = null
        this.moduleURI = null
        this.configPreset = null
        this.rawConfigPreset = null
        this.configURI = null
        this.changesetURL = null
        this.artifactsWithHistory = null
        this.component = null
        this.rawArtifactTags = null
        this.baseArtifactsMapId = null

        this.artifacts = null
        this.artIdsInView = null
        this.moduleViewId = null
        this.translateLangCode = null
        this.artifactWithAIs = null
        this.artTypesMap = null
        
        this.moduleTitle = null
        this.isAdmin = false

        this.attributeResources = {
            H_Translate: null,
            H_Toxic: null,
            H_Quality: null,
        }
    }
}

const state = new State()

export default state
