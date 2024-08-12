import { QUALITY_ATTR_NAME } from "../config/constants.js"
import { updateAttribute } from "../service/updateAttribute.js"
import { checkSingle } from "./checkSingle.js"
import renderer from "../view/Renderer.js"

export function checkQuality(prompts, actionLogWrapper) {
    return checkSingle(prompts, {
        loadingText: "Checking quality of the artifacts",
        promptKey: "quality",
        logTitle: "Quality",
        submittable: true,
        submitText: "Update quality",
        onSubmit: (e, artifactWithAIs, component) => {
            if (renderer.isDialogCancelButton(e)) {
                return
            }

            return updateAttribute(artifactWithAIs, component, {
                loadingText: "Updating Quality",
                e,
                attributeName: QUALITY_ATTR_NAME,
                targetArtTypes: ["requirement", "specification"],
            })
        },
        actionLogWrapper,
    })
}
