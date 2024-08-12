const PROD_SERVER_PORT = "8080"
// const PROD_SERVER_NAME = "descolfrprom1v.dc.company.com"
const PROD_SERVER_NAME = "localhost"

// Azure Service variables
const PROD_SERVER_URL = `https://${PROD_SERVER_NAME}:${PROD_SERVER_PORT}`

const TRANSLATOR_ENDPOINT = `${PROD_SERVER_URL}/api/v1/translator`
const CHAT_COMPLETION_ENDPOINT = `${PROD_SERVER_URL}/api/v1/openai`

export { TRANSLATOR_ENDPOINT, CHAT_COMPLETION_ENDPOINT, PROD_SERVER_URL }
