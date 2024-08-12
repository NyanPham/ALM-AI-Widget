import AIConnect from "./AIConnect.js"

class OpenAI extends AIConnect {
    constructor() {
        super()
    }

    configAI({ apiURL }) {
        this.config({ apiURL: `${apiURL}/chatCompletion`, checkBusyURL: `${apiURL}/checkBusy` })

        this.headers = {
            "content-type": "application/json",
        }
    }
    
    async chatCompletion({ text, assistantRole, signal, tool }) {
        const body = {
            userContent: text,
            sysContent: assistantRole,
            temperature: 0,
            tool,
        }

        return this.query({ body, method: "POST", withTimeout: true, apiURL: this.apiURL, signal })
    }

    checkServerBusy() {
        const body = {
            client: this.client,
        }

        return this.query({ body, method: "POST", withTimeout: true, withRetry: false, apiURL: this.checkBusyURL })
    }

    queryPendingQueue({ tool, clientId, forProgress = false }) {
        if (tool != null) {
            this.queueURL.searchParams.set("tool", tool)
        } else {
            this.queueURL.searchParams.delete("tool")
        }

        if (clientId != null) {
            this.queueURL.searchParams.set("clientId", clientId)
        } else {
            this.queueURL.searchParams.delete("clientId")
        }

        if (forProgress) {
            this.queueURL.searchParams.set("forProgress", true)
        } else {
            this.queueURL.searchParams.delete("forProgress")
        }

        return this.query({ method: "GET", withTimeout: true, withRetry: false, apiURL: this.queueURL })
    }

    cancelPendingQueueItem({ sessionId }) {
        const body = {
            client: this.client,
            sessionId,
        }

        return this.query({ body, method: "DELETE", withTimeout: true, withRetry: false, apiURL: this.queueURL })
    }

    queryFinishedRequests({ tool = null } = {}) {
        const body = {
            client: this.client,
        }

        if (tool != null) {
            this.resultURL.searchParams.set("tool", tool)
        } else {
            this.resultURL.searchParams.delete("tool")
        }

        return this.query({ body, method: "POST", withTimeout: true, withRetry: false, apiURL: this.resultURL })
    }

    removeFinishedRequest(sessionId) {
        const body = {
            sessionId,
            client: this.client,
        }

        return this.query({ body, method: "DELETE", withTimeout: true, withRetry: false, apiURL: this.resultURL })
    }

    subscribeRequestToServer({ data, tool, prompt, role }) {
        const body = {
            client: this.client,
            data,
            tool,
            prompt,
            role,
        }

        return this.query({ body, method: "POST", withTimeout: true, withRetry: false, apiURL: this.apiURL })
    }

    getResponse(res) {
        if (res.status === "success") {
            return res.data?.choices?.[0]?.text
        }
    }
}

// Need to move the queue manager out here the same as testCasesGeneratio

const serverQueueManager = {}

const testCasesGeneration = {
    async preprocessForTestCasesGeneration({ dngWorkspace, allArtifacts }) {
        const body = {
            data: {
                dngWorkspace,
                allArtifacts,
            },
            tool: "preprocess-for-test-cases",
        }
        
        return this.query({ method: "POST", body, withTimeout: false, apiURL: this.apiURL, signal: null })
    },
}

Object.assign(OpenAI.prototype, testCasesGeneration)
Object.assign(OpenAI.prototype, serverQueueManager)

export default OpenAI
