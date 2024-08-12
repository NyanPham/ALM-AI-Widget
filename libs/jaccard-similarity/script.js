function intersection(a, b) {
    const x = []
    for (const e of a) {
        if (b.includes(e)) {
            x.push(e)
        }
    }

    return x
}

function union(a, b) {
    const x = [...new Set([...a, ...b])]
    return x
}

function jaccardSimilarity(a, b) {
    const intersectionSize = intersection(a, b).length
    const unionSize = union(a, b).length
    return intersectionSize / unionSize
}

export default jaccardSimilarity
