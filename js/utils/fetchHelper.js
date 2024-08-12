import { CustomError, ABORT_REASONS } from "../models/CustomError.js"

export async function fetchWithTimeout({ url, options, cancelSignal = null, timeout = 5000 }) {
    const controller = new AbortController()

    try {
        if (timeout == null) {
            const res = await fetch(url, { ...options, signal: cancelSignal })
            return res
        }

        if (timeout != null && typeof timeout === "number") {
            if (cancelSignal != null) {
                cancelSignal.addEventListener("abort", () => {
                    controller.abort()
                })
            }

            const signal = controller.signal
            const timer = setTimeout(() => {
                controller.abort(ABORT_REASONS.TIMEOUT)
            }, timeout)
            const res = await fetch(url, { ...options, signal })
            clearTimeout(timer)

            // if (res.status == 429 && res.headers.get("X-Rate-Limit-Reset-Tokens") != null) {
            //     throw new RateLimiError(res.statusText, res.status, parseInt(res.headers.get("X-Rate-Limit-Reset-Tokens")))
            // }

            // TODO: Do some research on how to get the limit reset time to optimize the wait time

            if (!res.ok) {
                throw new CustomError(res.statusText, res.status)
            }

            return res
        }
    } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") controller.signal.throwIfAborted()

        throw err
    }
}

export async function fetchWithRetry({ url, options, cancelSignal = null, delay = 5000, tries = 3, timeout = null }) {
    let res, error

    for (let i = 0; i < tries; i++) {
        try {
            error = null

            if (timeout == null) {
                res = await fetch(url, { ...options, signal: cancelSignal })
            } else {
                res = await fetchWithTimeout({
                    url,
                    options,
                    cancelSignal,
                    timeout,
                })
            }

            if (res.ok) break
        } catch (err) {
            error = err
            if (cancelSignal?.aborted) break

            await new Promise((resolve) => setTimeout(resolve, delay))
            console.log(`Retrying... ${tries - (i + 1)} tries left`)

            continue
        }
    }

    if (error) throw error
    return res
}

export async function fetchItemsInBatches(items, batchSize, promiseHandler, progressFn = null, abortHandler = null) {
    const responses = []
    const itemsLength = items.length
    
    for (let i = 0; i < itemsLength; i += batchSize) {
        const end = Math.min(i + batchSize, itemsLength)
        const batch = items.slice(i, end)

        try {
            const batchResponses = await Promise.allSettled(batch.map(promiseHandler))
            responses.push(...batchResponses)

            if (progressFn && typeof progressFn === "function") {
                progressFn({
                    responses,
                    batchResponses,
                    currentIndex: i,
                    totalIndices: itemsLength,
                })
            }
        } catch (err) {
            throw err
        }
        
        if (abortHandler?.isAborted()) break
    }

    return responses
}

export function getFetchErrorMessage(err, furtherInfo = null) {
    const errorName = typeof err === "string" ? err : err.name

    switch (errorName) {
        case ABORT_REASONS.ABORT_ERROR: {
            return `User Aborted${furtherInfo ? `: ${furtherInfo}` : ""}`
        }
        case ABORT_REASONS.TIMEOUT: {
            return `Request Timeout${furtherInfo ? `: ${furtherInfo}` : ""}`
        }
        default:
            return `${err.message || errorName}${furtherInfo ? `: ${furtherInfo}` : ""}`
    }
}
