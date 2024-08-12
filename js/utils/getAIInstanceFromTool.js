import { openAI } from "../aiInstances.js"

export const TOOL_NAMES = {
    translate: "translate",
    toxic: "toxic",
    quality: "quality",
    consistency: "consistency",
    testCasesGen: "test-cases-generation",
    all: "all-tools"
}

export function getAIInstanceFromTool(tool) {
    switch (tool) {
        case TOOL_NAMES.translate:
        case TOOL_NAMES.toxic:
        case TOOL_NAMES.quality:
        case TOOL_NAMES.consistency:
        case TOOL_NAMES.testCasesGen:
            return openAI
        default:
            return null
    }
}