import { fetchWithRetry, fetchWithTimeout } from "../../utils/fetchHelper.js"

export const DELAY = 7000
export const TRIES = 3
export const TIMEOUT = 60000

class AIConnect {
    constructor() {
        this.configured = false
        this.client = null
    }

    setClient(client) {
        this.client = client
    }

    config({ apiURL, checkBusyURL = `${apiURL}/checkBusy`, queueURL = `${apiURL}/queue`, resultURL = `${apiURL}/results` }) {
        this.apiURL = new URL(apiURL)
        this.checkBusyURL = new URL(checkBusyURL)
        this.queueURL = new URL(queueURL)
        this.resultURL = new URL(resultURL)

        this.headers = {
            "Content-Type": "application/json",
        }

        this.configured = true
    }

    async query({ body = null, method = "GET", withTimeout = true, withRetry = true, apiURL = this.apiURL, signal = null }) {
        if ((method === "POST" && body == null) || !this.configured) return false

        const options = {
            method,
            headers: this.headers,
        }

        if (body != null) {
            body.client = this.client
            options.body = JSON.stringify(body)
        }

        try {
            let res, fetchFunc
            if (!withTimeout && !withRetry) {
                res = await fetch(apiURL, { ...options, signal: signal })
            }

            const fetchConfig = {
                url: apiURL,
                options,
                cancelSignal: signal,
            }

            if (withTimeout) {
                fetchConfig.timeout = TIMEOUT
                fetchFunc = fetchWithTimeout
            }

            if (withRetry) {
                fetchConfig.delay = DELAY
                fetchConfig.tries = TRIES
                fetchFunc = fetchWithRetry
            }

            res = await fetchFunc(fetchConfig)

            const contentType = res.headers.get("Content-Type")
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await res.json()
                return data
            }

            return res
        } catch (err) {
            throw err
        }
    }
}

export default AIConnect
