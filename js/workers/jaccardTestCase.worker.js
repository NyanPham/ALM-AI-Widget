// jaccardTestCase.worker.js

// Initialize the worker
self.addEventListener("message", (event) => {
    if (event.data.type === "initialize") {
        self.concurTCs = event.data.concurTCs
        self.existingTestCasesByWords = event.data.existingTestCasesByWords
    } else if (event.data.type === "start") {
        calculateSimilarities(event.data.similarityThreshold)
    }
})

function calculateSimilarities(similarityThreshold) {
    const groups = new Map()
    const visited = new Map()

    const POTENTIAL_MAX = 7

    const concursLength = self.concurTCs.length
    const existingTestCaseEntries = Array.from(self.existingTestCasesByWords.entries())
    const existingLength = existingTestCaseEntries.length

    for (let i = 0; i < concursLength; i++) {
        const { index, title: requiredTitle, description: requiredDescription } = self.concurTCs[i]
        const currentDescriptionWords = new Set(requiredDescription?.split(" ") || "")
        const currentDescriptionNumbers = (requiredDescription.match(/\d+/g) || []).map(Number)

        for (let j = 0; j < existingLength; j++) {
            const [id, value] = existingTestCaseEntries[j]
            if (visited.has(id)) continue

            const { title: existingTitle, description: existingDescriptionWords } = value

            // Calculate Jaccard simiflarity using intersection and union of word sets
            const intersectionSize = new Set([...currentDescriptionWords].filter((word) => existingDescriptionWords.has(word))).size
            const unionSize = currentDescriptionWords.size + existingDescriptionWords.size - intersectionSize
            let similarity = intersectionSize / unionSize
            let numberSimilarity = 0

            const numberMatches = currentDescriptionNumbers.filter((num) => existingDescriptionWords.has(num.toString()))

            if (currentDescriptionNumbers.length > 0 && numberMatches.length === 0) continue

            if (numberMatches.length > 0) {
                similarity = 1
                numberSimilarity = numberMatches.length / currentDescriptionNumbers.length
            }

            if (similarity < similarityThreshold) continue

            const group = groups.get(index) || []
            visited.set(id, true)
            group.push({ id, similarity, numberSimilarity })
            group.sort((a, b) => {
                if (b.similarity === a.similarity) {
                    return b.numberSimilarity - a.numberSimilarity
                }

                return b.similarity - a.similarity
            })  
            
            if (group.length > POTENTIAL_MAX) {
                const removed = group.pop();
                visited.delete(removed.id);
            }
            groups.set(index, group)
        }
    }

    // Send the result back to the main thread
    self.postMessage({ type: "result", data: { workerGroups: Array.from(groups.entries()) } })
}
