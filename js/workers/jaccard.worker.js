// consistencyWorker.js

// Initialize the worker
self.addEventListener("message", (event) => {
    if (event.data.type === "initialize") {
        const { concurArts, artifactsByWords } = event.data
        self.concurArts = concurArts
        self.artifactsByWords = artifactsByWords
    }
})

// Handle messages from the main thread
self.addEventListener("message", (event) => {
    if (event.data.type === "start") {
        const groups = new Map()

        const { similarityThreshold } = event.data
        const concursLength = self.concurArts.length
        
        for (let i = 0; i < concursLength; i++) {
            const currentConcur = self.concurArts[i]

            const { currentArt, remainingArts } = currentConcur
            const currentWords = self.artifactsByWords.get(currentArt.id)
            const currentGroup = [currentArt]
            const remainingLength = remainingArts.length

            for (let j = 0; j < remainingLength; j++) {
                const otherArt = remainingArts[j]
                const otherWords = self.artifactsByWords.get(otherArt.id)

                // if ((currentWords[0] == otherWords[0] && currentWords[1] == otherWords[1]) || currentWords[2] == otherWords[2]) {
                //     currentGroup.push(otherArt);
                //     continue;
                // }   
                
                // Calculate Jaccard similarity using intersection and union of word sets
                const intersectionSize = new Set([...currentWords].filter((word) => otherWords.has(word))).size
                const unionSize = currentWords.size + otherWords.size - intersectionSize
                const similarity = intersectionSize / unionSize

                if (similarity >= similarityThreshold) {
                    currentGroup.push(otherArt) // Add similar art to the current group
                }
            }
            
            if (currentGroup.length > 1) {
                groups.set(currentArt.id, currentGroup) // Store the group in the Map
            }
        }
        
        // Send the result back to the main thread
        self.postMessage({ type: "result", data: { workerGroups: Array.from(groups.entries())} })
    }
})
