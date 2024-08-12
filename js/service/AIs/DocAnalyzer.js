import AIConnect from "./AIConnect.js"

class DocAnalyzer extends AIConnect {
    constructor() {
        super()
    }

    static convertFileToBase64(file) {
        return new Promise((resolve) => {
            const fileReader = new FileReader()

            fileReader.onload = (e) => {
                const base64String = e.target.result.replace("data:application/pdf;base64,", "")
                resolve(base64String)
            }

            fileReader.readAsDataURL(file)
        })
    }

    configAnalyzer({ apiURL, modelId, location, queryParams }) {
        const appendURL = (apiURL += `/${modelId}`)

        this.config({ apiURL: appendURL })
        this.location = location
        this.modelId = modelId

        Object.entries(queryParams).forEach(([key, value]) => {
            this.apiURL.searchParams.set(key, value)
        })
    }

    async parseDocByBase64String(base64Str) {
        const body = {
            base64Source: base64Str,
        }

        return this.query({ body, method: "POST", withTimeout: true, apiURL: this.apiURL })
    }

    async pollForResults(operationLocation) {
        let data

        try {
            do {
                data = await this.analyzeResults(operationLocation)
            } while (data.status === "running")

            if (data.status === "succeeded") return data.analyzeResult
            throw new Error("Failed to analyze result!")
        } catch (err) {
            throw err
        }
    }

    async analyzeResults(operationLocation) {
        return this.query({ method: "GET", apiURL: operationLocation })
    }
}

export default DocAnalyzer
