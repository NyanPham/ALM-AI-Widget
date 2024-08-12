const consoleLogger = (function () {
    let oldConsole = null
    let pub = {}

    pub.enableLogger = function enableLogger() {
        if (oldConsole?.log == null || oldConsole?.info == null) return

        window["console"]["log"] = oldConsole.log
        window["console"]["info"] = oldConsole.info
    }
    
    pub.disableLogger = function disableLogger() {
        oldConsole = {
            log: console.log,
            info: console.info,
        }
        
        window["console"]["log"] = function () {}
        window["console"]["info"] = function () {}
    }

    return pub
})()
