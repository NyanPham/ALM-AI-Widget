class ActionLogWrapper {
    constructor(widgetName, actions) {
        this.widgetName = widgetName
        this.actions = actions
        this.actionLog = null
    }

    async registerActions() {
        if (this.actionLog == null || this.actions == null) return

        try {
            const actionValues = Object.values(this.actions)
            const promises = []

            actionValues.forEach((value) => {
                const { request = null, update = null, remove = null, export: exportFunc = null } = value

                if (request) {
                    const { name, description } = request

                    promises.push(
                        this.actionLog.registerActions(this.widgetName, [
                            {
                                name,
                                description,
                            },
                        ])
                    )
                }

                if (update) {
                    const { name, description } = update

                    promises.push(
                        this.actionLog.registerActions(this.widgetName, [
                            {
                                name,
                                description,
                            },
                        ])
                    )
                }

                if (exportFunc) {
                    const { name, description } = exportFunc

                    promises.push(
                        this.actionLog.registerActions(this.widgetName, [
                            {
                                name,
                                description,
                            },
                        ])
                    )
                }

                if (remove) {
                    const { name, description } = remove

                    promises.push(
                        this.actionLog.registerActions(this.widgetName, [
                            {
                                name,
                                description,
                            },
                        ])
                    )
                }

                return promises
            })

            const responses = await Promise.allSettled(promises)

            const errors = responses.reduce((reduced, res) => {
                if (res.status === "fulfilled") return reduced

                return [...reduced, res.reason]
            }, [])

            if (errors.length > 0) {
                throw new Error(errors.join("\n"))
            }
        } catch (e) {
            console.error(e)
        }
    }

    async logAnAction(actionName, details = {}) {
        if (this.actionLog == null) return

        try {
            await this.actionLog.logAction(actionName, details)
        } catch (err) {
            console.error(err)
        }
    }

    async initActionLog() {
        try {
            const hmsLoader = new HMSLoader()
            SheilaCompleteLoadPromise = hmsLoader.getCompleteLoadPromise()
            await hmsLoader.init()
            await SheilaCompleteLoadPromise

            this.actionLog = new HMSActionLog()
            await this.registerActions()
        } catch (err) {
            console.log(err)
        }
    }
}

export default ActionLogWrapper
