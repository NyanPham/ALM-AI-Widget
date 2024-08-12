import { fetchArtIdsInView, getModuleBasicInfo, getViewURIs, queryModuleArtifacts } from "./module.js"
import { processCurrentComponentPage, processConfigAndChangeset } from "./component.js"
import { updateSelectedResultsToDNG } from "./updateAttribute.js"
import Prompts from "./Prompts.js"

export {
    fetchArtIdsInView, getModuleBasicInfo, getViewURIs, queryModuleArtifacts,
    processCurrentComponentPage, processConfigAndChangeset,
    Prompts,
    updateSelectedResultsToDNG
}