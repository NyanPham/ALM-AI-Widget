import { Translator, OpenAI, TRANSLATOR_ENDPOINT, CHAT_COMPLETION_ENDPOINT } from "./service/AIs/index.js"

// Azure Translator Config
const translator = new Translator()
translator.configTranslate({
    apiURL: TRANSLATOR_ENDPOINT,
})

// Azure OpenAI Config
const openAI = new OpenAI()
openAI.configAI({
    apiURL: CHAT_COMPLETION_ENDPOINT,
})
 
export { translator, openAI }
