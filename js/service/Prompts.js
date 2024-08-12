class Prompts {
    constructor(baseURL, pathname) {
        this.baseURL = baseURL
        this.pathname = pathname

        this.headers = {
            "content-type": "application/json",
        }

        this.promptsData = {}
    }

    async getPrompts() {
        try {
            const res = await fetch(`${this.baseURL}/${this.pathname}`)
            if (!res.ok) return false

            const data = await res.json()

            this.promptsData = {
                ...data.data
            }
            
            return true
        } catch (err) {
            throw err
        }
    }
    
    async updatePrompt(promptName, newValue) {}

    hasPromptsData() {
        return Object.entries(this.promptsData)?.length > 0
    }
    
    getPrompt(promptName) {
        return this.promptsData[promptName]
    }
}

export default Prompts
