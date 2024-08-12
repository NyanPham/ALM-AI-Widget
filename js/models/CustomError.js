class CustomError extends Error {
    constructor(message, code) {
        super(message)
        this.code = code
        this.name = "CustomError"

        Error.captureStackTrace(this, CustomError)
    }
}

const ABORT_REASONS = {
    TIMEOUT: "Timeout",
    ABORT_ERROR: "AbortError",
}

export { CustomError, ABORT_REASONS }
