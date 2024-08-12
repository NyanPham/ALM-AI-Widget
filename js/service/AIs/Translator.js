import AIConnect from "./AIConnect.js"

class Translator extends AIConnect {
    constructor() {
        super()
    }

    configTranslate({ apiURL }) {
        this.config({ apiURL })

        this.headers = {
            "Content-type": "application/json",
        }
    }
        
    async translate({ to, text, signal = null, from = "en", apiVersion = "3.0" }) {
        const endpoint = new URL(`${this.apiURL.href}/translate`)
        endpoint.searchParams.append("api-version", apiVersion)
        endpoint.searchParams.append("from", from)
        endpoint.searchParams.append("to", to)

        const body =  { 
            text,
            to,
            from,
        };

        return this.query({ body, method: "POST", withTimeout: true, apiURL: endpoint, signal })
    }
    
    async getLanguages() {
        const endpoint = new URL(`${this.apiURL.href}/languages`)
        const { data } = await this.query({ method: "GET", withTimeout: true, apiURL: endpoint })
        return data
    }
}

export default Translator
