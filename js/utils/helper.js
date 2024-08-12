export const domParser = new DOMParser()
export const xmlSerializer = new XMLSerializer()

export function toXml(string) {
    return domParser.parseFromString(string, "text/xml")
}

export function getTags(tagName, parent = document) {
    return [...parent?.getElementsByTagName(tagName)]
}

export function getTag(tagName, parent = document) {
    return parent?.getElementsByTagName(tagName)[0]
}

export function getById(id) {
    return document.getElementById(id)
}

export function groupBy(array, groupKey) {
    return array.reduce((grouped, item) => {
        const key = item[groupKey]

        if (grouped[key] == null) {
            return {
                ...grouped,
                [key]: 1,
            }
        }

        return {
            ...grouped,
            [key]: grouped[key] + 1,
        }
    }, {})
}

export function createElement(type, options = {}, ...children) {
    const element = document.createElement(type)
    
    Object.entries(options).forEach(([key, value]) => {
        if (key === "class") {
            element.classList.add(value)
            return
        }

        if (key === "dataset") {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue
            })

            return
        }

        if (key === "text") {
            element.innerText = value
            return
        }
        
        if (key === "html") {
            element.innerHTML = value
            return
        }

        element.setAttribute(key, value)
    })

    if (children?.length > 0) {
        children.forEach((child) => {
            element.appendChild(child)
        })
    }

    return element
}

export function saveStorage(key, value) {
    let valueToStore = value

    if (typeof value === "export function") {
        valueToStore = value()
    }

    if (typeof valueToStore !== "string") {
        valueToStore = JSON.stringify(valueToStore)
    }

    localStorage.setItem(key, valueToStore)
}

export function getStorage(key) {
    const jsonValue = localStorage.getItem(key)

    if (jsonValue == null) {
        return null
    }

    return JSON.parse(jsonValue)
}

export function qs(selector, parent = document) {
    return parent.querySelector(selector)
}

export function qsa(selector, parent = document) {
    return [...parent.querySelectorAll(selector)]
}

const HIDE_CLASS = "d-none"
export function showEl(element) {
    element.classList.remove(HIDE_CLASS)
}

export function hideEl(element) {
    element.classList.add(HIDE_CLASS)
}

export function isHidden(element) {
    return element.classList.contains(HIDE_CLASS)
}

export function toggleEl(element, shouldShow) {
    element.classList.toggle(HIDE_CLASS, !shouldShow)
}

export function createJsonOptions() {
    return {
        headers: {
            accept: "application/json",
            "OSLC-Core-Version": 2.0,
        },
    }
}

export function createXmlOptions() {
    return {
        headers: {
            accept: "application/rdf+xml",
            "OSLC-Core-Version": 2.0,
        },
    }
}

export function getKeyFromMapValue(map, searchValue) {
    let searchKey
    ;[...map.entries()].forEach(([key, value]) => {
        if (searchValue === value) searchKey = key
    })

    return searchKey
}

export function buildCollapsibleBlock(id, title, contentNode) {
    const wrapper = createElement("div", { class: "accordion" })
    const panel = createElement("div", { class: "accordion-panel" })
    const titleEl = createElement("h2", { id: `panel${id}-title` })
    const button = createElement("button", {
        class: "accordion-trigger",
        "aria-expanded": false,
        "aria-controls": `accordion${id}-content`,
        text: title,
    })
    titleEl.appendChild(button)

    const contentEl = createElement("div", {
        class: "accordion-content",
        role: "region",
        "aria-labelledby": `panel${id}-title`,
        "aria-hidden": true,
        style: "display: grid; grid-template-rows: 0fr; transition: grid-template-rows 500ms;",
    })

    const contentInnerEl = createElement("div")
    contentInnerEl.style.overflow = "hidden"

    contentInnerEl.appendChild(contentNode)
    contentEl.appendChild(contentInnerEl)

    panel.appendChild(titleEl)
    panel.appendChild(contentEl)
    wrapper.appendChild(panel)

    /***************** For function ***************/

    wrapper.addEventListener("click", (e) => {
        e.stopPropagation()
        e.preventDefault()

        const panel = e.target.closest(".accordion-panel")
        if (!panel) return

        const button = panel.querySelector("button")
        const contentEl = panel.querySelector(".accordion-content")
        const isOpened = button.getAttribute("aria-expanded") === "true"

        button.setAttribute("aria-expanded", !isOpened)
        contentEl.setAttribute("aria-hidden", isOpened)

        contentEl.style.gridTemplateRows = isOpened ? "1fr" : "0fr"
    })

    return wrapper
}

export function findChildByTagName(selector, parent = document) {
    return [...parent.children].find((child) => child.tagName === selector)
}

export function findChildrenByTagName(selector, parent = document) {
    return [...parent.children].filter((child) => child.tagName === selector)
}

export function slugify(string) {
    return string
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
}

export function xmlToString(xml) {
    return xmlSerializer.serializeToString(xml)
}

export async function wait(delay = 0) {
    await new Promise((resolve) => {
        setTimeout(() => {
            resolve()
        }, delay)
    })
}

export async function executePromisesBySteps(promises, step = 8) {
    for (let i = 0; i < promises.length; i += step) {
        const currentPromises = promises.slice(i, i + step).filter((promise) => promise != null)
        await Promise.all(currentPromises)
    }
}

export function hasDeepSameEntryAttributes(entryA, entryB) {
    if (entryA.attributes.length !== entryB.attributes.length) return false

    return [...entryA.attributes].every(({ name, value }) => {
        return entryB.getAttribute(name) === value
    })
}

export function generateUUID() {
    var dt = new Date().getTime()
    var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (dt + Math.random() * 16) % 16 | 0
        dt = Math.floor(dt / 16)
        return (c == "x" ? r : (r & 0x3) | 0x8).toString(16)
    })
    return uuid
}

export function humanizeDate(timestamp) {
    const date = new Date(timestamp);
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const formattedDate = `${month} ${day}, ${year} ${hours}:${minutes}`;

    return formattedDate
}

export function setStyleProperty(element, name, value) {
    element.style.setProperty(name, value)
}

export function getStyleProperty(element, name) {
    return getComputedStyle(element).getPropertyValue(name)
}

export function clearContent(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild)
    }
}

export function exportFile(content, type, fileName) {
    const exportLink = createElement("a")

    window.parent.document.body.appendChild(exportLink)

    let fileNameWithExtension = fileName
    if (isFireFox()) {
        fileNameWithExtension += type.startsWith("text/csv") ? ".csv" : ".txt"
    }
    
    const file = new Blob([content], { type })
    exportLink.href = URL.createObjectURL(file)
    exportLink.download = fileNameWithExtension
    exportLink.click()
    URL.revokeObjectURL(exportLink.href)

    exportLink.remove()
}
// CSV
export function csmaker({ headers, data }) {
    const csvRows = []

    csvRows.push(headers.join(","))
    data.forEach((row) => {
        const values = headers.map((e) => {
            return row[e]
        })
        csvRows.push(values.join(","))
    })

    return csvRows.join("\n")
}

export function splitPromiseSettledResponses(responses) {
    const { successList, failList } = responses.reduce(
        (obj, res) => {
            if (res.status !== "fulfilled") {
                return {
                    ...obj,
                    failList: [...obj.failList, res.reason],
                }
            }

            return {
                ...obj,
                successList: [...obj.successList, res.value],
            }
        },
        {
            successList: [],
            failList: [],
        }
    )

    return [successList, failList]
}

export function debounce(func, timeout = 300) {
    let timer
    return (...args) => {
        clearTimeout(timer)
        timer = setTimeout(() => {
            func.apply(this, args)
        }, timeout)
    }
}

export function isFireFox() {
    return navigator.userAgent.match(/firefox|fxios/i)
}

export function getOrdinal(number) {
    if (number >= 11 && number <= 13) {
        return number + "th";
    }

    const lastDigit = number % 10;
    switch (lastDigit) {
        case 1:
            return number + "st";
        case 2:
            return number + "nd";
        case 3:
            return number + "rd";
        default:
            return number + "th";
    }
}