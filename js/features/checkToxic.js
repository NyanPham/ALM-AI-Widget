import { TOXIC_ATTR_NAME } from "../config/constants.js"
import { updateAttribute } from "../service/updateAttribute.js"
import { checkSingle } from "./checkSingle.js"
import renderer from "../view/Renderer.js"

export function checkToxic(prompts, actionLogWrapper) {
    return checkSingle(prompts, {
        loadingText: "Checking toxicity of the artifacts",
        promptKey: "toxic",
        logTitle: "Toxic",
        submittable: true,
        submitText: "Update toxic",
        onSubmit: (e, artifactWithAIs, component) => {
            if (renderer.isDialogCancelButton(e)) {
                return
            }
            
            return updateAttribute(artifactWithAIs, component, {
                loadingText: "Updating Toxic",
                e,
                attributeName: TOXIC_ATTR_NAME,
                targetArtTypes: ["requirement", "specification"],
            })
        },
        actionLogWrapper,
    })
}

export function updateToxicAttributes(artifacts, component) {
    const artifactWithAIs = artifacts // Need to process arts to artsWithAis here

    return updateAttribute(artifactWithAIs, component, {
        loadingText: "Updating Toxic",
        e,
        attributeName: TOXIC_ATTR_NAME,
        targetArtTypes: ["requirement", "specification"],
    })
}
