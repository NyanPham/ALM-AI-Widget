class AbortHandler {
    constructor() {
        this.resetAbortController();
    }

    resetAbortController() {
        if (this.abortController == null || this.abortController?.signal.aborted) this.abortController = new AbortController();
    }

    abortProcessing() {
        this.abortController.abort();
    }

    abortSignal() {
        return this.abortController?.signal;
    }
    
    isAborted() {
        return this.abortController?.signal.aborted;
    }
}

export default AbortHandler