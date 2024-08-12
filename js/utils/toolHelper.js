import { STATS_WIDGET_ACTIONS } from "../config/constants.js"

export function getStatsAction(tool, act) {
    let toolFeature

    switch (tool.toLowerCase()) {
        case "translate": {
            toolFeature = STATS_WIDGET_ACTIONS.translate
            break
        }
        case "consistency": {
            toolFeature = STATS_WIDGET_ACTIONS.consistency
            break
        }
        case "toxic": {
            toolFeature = STATS_WIDGET_ACTIONS.toxic
            break
        }
        case "quality": {
            toolFeature = STATS_WIDGET_ACTIONS.quality
            break
        }
        case "test-cases-generation": {
            toolFeature = STATS_WIDGET_ACTIONS.testCasesGeneration
            break
        }
        default: {
            throw new Error(`${tool} is unknown!`)
        }
    }

    return toolFeature?.[act]
}