import { IBM_XML_TAG_NAMES, IBM_XML_TAG_ATTRS } from "../config/constants.js"
import { getTag, toXml, xmlToString } from "../utils/helper.js"
import { checkAndCreateMissingAttributes } from "./component.js"

// Query
export const SELECT_FIELD_URIS = {
    id: "http://purl.org/dc/terms/identifier",
    bookOrder: "http://www.ibm.com/xmlns/rdm/rdf/bookOrder",
    boundArtifact: "http://www.ibm.com/xmlns/rdm/rdf/boundArtifact",
    module: "http://www.ibm.com/xmlns/rdm/rdf/module",
    modified: "http://purl.org/dc/terms/modified",
    created: "http://purl.org/dc/terms/created",
}

export async function queryArtifactsObjects({ params = {}, select = null, where = null, sort = null, fetchConfig = null, hostContext }) {
    const { execute = true, fullObject = true, count = false, displayBaseProperties = true, optimizedModuleStructure = true } = params
    
    const xmlText = `<rdf:RDF
        xmlns:dcterms="http://purl.org/dc/terms/"
        xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
        xmlns:rs="http://www.w3.org/2001/sw/DataAccess/tests/result-set#"
        xmlns:rrmNav="http://com.ibm.rdm/navigation#"
        xmlns:rrmViewdata="http://com.ibm.rdm/viewdata#"
        xmlns:rt="https://almt.company.com/rmT1/views"
        xmlns:rm="http://www.ibm.com/xmlns/rdm/rdf/"
        xmlns:xsd="http://www.w3.org/2001/XMLSchema#"
        xmlns:rql="http://www.ibm.com/xmlns/rdm/rql/"
        xmlns:owl="http://www.w3.org/2002/07/owl#"
    >               
        <rm:View rdf:about="">
            <rm:rowquery rdf:parseType="Resource">
                <rql:select rdf:parseType="Resource">
                    <rdf:_1 rdf:parseType="Resource">
                        <rql:object>R1</rql:object>
                    </rdf:_1>   
                </rql:select>
            </rm:rowquery>
            <rm:displayBaseProperties rdf:datatype="http://www.w3.org/2001/XMLSchema#boolean"></rm:displayBaseProperties>
            <rrmNav:scope>public</rrmNav:scope>
            <rm:ofType>GridView</rm:ofType>
            <dcterms:description> </dcterms:description>
            <dcterms:title>Grid View 1</dcterms:title>
        </rm:View>
    </rdf:RDF>
    `

    const xmlDoc = toXml(xmlText)
    const displayBaseProps = getTag(IBM_XML_TAG_NAMES.view.displayProps, xmlDoc.documentElement)
    displayBaseProps.textContent = displayBaseProperties

    const rowQuery = getTag(IBM_XML_TAG_NAMES.view.rowQuery, xmlDoc.documentElement)

    if (select != null) {
        const rqlSelect = getTag(IBM_XML_TAG_NAMES.view.select, xmlDoc.documentElement)
        select.forEach((fieldUri, idx) => {
            const rdfField = xmlDoc.createElement(`rdf:_${idx + 2}`)
            rdfField.setAttribute("rdf:parseType", "Resource")

            const obj = xmlDoc.createElement("rql:object")
            obj.textContent = "R1"

            const field = xmlDoc.createElement("rql:field")
            field.setAttribute(IBM_XML_TAG_ATTRS.resource, fieldUri)

            rdfField.appendChild(obj)
            rdfField.appendChild(field)

            rqlSelect.appendChild(rdfField)
        })
    }

    if (where != null) {
        const rqlWhere = xmlDoc.createElement("rql:where")
        rqlWhere.setAttribute("rdf:parseType", "Resource")
        rowQuery.appendChild(rqlWhere)

        Object.entries(where).forEach(([key, value], idx) => {
            const rdfField = xmlDoc.createElement(`rdf:_${idx + 1}`)
            rdfField.setAttribute("rdf:parseType", "Resource")

            switch (key) {
                case "module": {
                    const op = xmlDoc.createElement("rql:op")
                    op.textContent = "="

                    const e1 = xmlDoc.createElement("rql:e1")
                    e1.setAttribute("rdf:parseType", "Resource")

                    const rqlField = xmlDoc.createElement("rql:field")
                    rqlField.setAttribute(IBM_XML_TAG_ATTRS.resource, value.moduleRdfURI || SELECT_FIELD_URIS.module)
                    const rqlObj = xmlDoc.createElement("rql:object")
                    rqlObj.textContent = "R1"
                    e1.appendChild(rqlField)
                    e1.appendChild(rqlObj)

                    const e2 = xmlDoc.createElement("rql:e2")
                    e2.textContent = `<${value.moduleResourceURI}>`

                    rdfField.appendChild(op)
                    rdfField.appendChild(e1)
                    rdfField.appendChild(e2)
                    break;
                }

                case "artifactType": {
                    const e1 = xmlDoc.createElement("rql:e1")
                    e1.textContent = "R1"

                    const e2 = xmlDoc.createElement("rql:e2")
                    const seq = xmlDoc.createElement("rdf:Seq")
                    const li = xmlDoc.createElement("rdf:li")
                    li.setAttribute("rdf:resource", value)

                    seq.appendChild(li)
                    e2.appendChild(seq)

                    const op = xmlDoc.createElement("rql:op")
                    op.textContent = "is"
                    
                    rdfField.appendChild(e1)
                    rdfField.appendChild(e2)
                    rdfField.appendChild(op)
                    break;
                }

                case "modifiedDate":
                case "createdDate": {
                    const op = xmlDoc.createElement("rql:op")
                    op.textContent = value.operand || "="

                    const e1 = xmlDoc.createElement("rql:e1")
                    e1.setAttribute("rdf:parseType", "Resource")

                    const rqlField = xmlDoc.createElement("rql:field")
                    const seq = xmlDoc.createElement("rdf:Seq")
                    const li = xmlDoc.createElement("rdf:li")
                    li.setAttribute(IBM_XML_TAG_ATTRS.resource, value.rdfURI)
                    seq.appendChild(li)
                    rqlField.appendChild(seq)

                    const rqlObj = xmlDoc.createElement("rql:object")
                    rqlObj.textContent = "R1"
                    e1.appendChild(rqlField)
                    e1.appendChild(rqlObj)

                    const e2 = xmlDoc.createElement("rql:e2")
                    e2.textContent = value.date

                    rdfField.appendChild(op)
                    rdfField.appendChild(e1)
                    rdfField.appendChild(e2)
                    break;
                }

                case "format": {
                    const e1 = xmlDoc.createElement("rql:e1")
                    e1.textContent = "R1"
    
                    const e2 = xmlDoc.createElement("rql:e2")
                    const seq = xmlDoc.createElement("rdf:Seq")
                    const li = xmlDoc.createElement("rdf:li")
                    li.textContent = value
    
                    seq.appendChild(li)
                    e2.appendChild(seq)
    
                    const op = xmlDoc.createElement("rql:op")
                    op.textContent = "format"
    
                    rdfField.appendChild(e1)
                    rdfField.appendChild(e2)
                    rdfField.appendChild(op)
                    break;
                }
                
                default: 
                    rdfField.remove()
            }

            rqlWhere.appendChild(rdfField)
        })
    }

    if (sort != null && Array.isArray(sort)) {
        const rqlSort = xmlDoc.createElement("rql:sort")
        rqlSort.setAttribute("rdf:parseType", "Resource")
        rowQuery.appendChild(rqlSort)

        sort.forEach((field, idx) => {
            const rdfField = xmlDoc.createElement(`rdf:_${idx + 1}`)
            rdfField.setAttribute("rdf:parseType", "Resource")

            const objField = xmlDoc.createElement("rql:objField")
            objField.setAttribute("rdf:parseType", "Resource")
            const rqlField = xmlDoc.createElement("rql:field")
            rqlField.setAttribute(IBM_XML_TAG_ATTRS.resource, field.rdfURI)
            const rqlObj = xmlDoc.createElement("rql:object")
            rqlObj.textContent = "R1"

            objField.appendChild(rqlField)
            objField.appendChild(rqlObj)

            const rqlOrder = xmlDoc.createElement("rql:order")
            rqlOrder.textContent = field.orderBy

            rdfField.appendChild(objField)
            rdfField.appendChild(rqlOrder)

            rqlSort.appendChild(rdfField)
        })
    }

    const url = new URL(`${hostContext}/views`)
    url.searchParams.append("execute", execute)
    url.searchParams.append("fullObject", fullObject)
    url.searchParams.append("count", count)
    url.searchParams.append("displayBaseProperties", displayBaseProperties)
    url.searchParams.append("optimizedModuleStructure", optimizedModuleStructure)

    const config = {
        headers: {
            Accept: "text/json",
            "Content-Type": "text/plain",
            "DoorsRP-Request-Type": "private",
            "net.jazz.jfs.owning-context": decodeURIComponent(fetchConfig.componentURI),
            "oslc.configuration": decodeURIComponent(fetchConfig.configURI),
        },
        method: "POST",
        body: xmlToString(xmlDoc.documentElement),
    }

    try {
        const res = await fetch(url, config)
        const data = await res.json()

        if (!res.ok) {
            throw new Error(data.detailedMessage)
        }

        return data
    } catch (err) {
        throw err
    }
}

// Import
const defaultAttributeMap = new Map([
    ["ID", "id"],
    ["Contents", "Primary Text"],
    ["Artifact Type", "Artifact Type"],
    ["isHeading", "isHeading"],
])

export function convertArrayOfObjectIntoArrayOfArray(arrayOfObjects) {
    const arrayOfArrays = arrayOfObjects.map((obj) => Object.values(obj))
    return arrayOfArrays
}

export function createArtifactAttrArray(headers) {
    const attrArr = Object.values(headers).map((value) => (defaultAttributeMap.has(value.headerTitle) ? defaultAttributeMap.get(value.headerTitle) : value.headerTitle))
    const customAttrs = Object.values(headers)
        .filter((value) => !defaultAttributeMap.has(value.headerTitle) && value.headerTitle.startsWith("H_"))
        .map((value) => value.headerTitle)

    return { attrArr, customAttrs }
}

export function createXlsxFile(arrayOfArrays, attrList) {
    const importData = [attrList, ...arrayOfArrays]

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(importData)
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1")
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const xlsxFile = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    return xlsxFile
}

// upload xlsx file to module
export async function uploadFile({ fileData, componentURL, changesetURL, moduleURL, hostContext }) {
    const importFormatUrl = "import/spreadSheet?private=*&format=xlsx&importFormat=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet&resourceContext="
    const formData = new FormData()
    formData.append("delimiter", ",")
    formData.append("file", fileData)
    formData.append("dataStream", fileData)
    formData.append("requirementsGroup", "on")
    formData.append("createGroup", "on")
    formData.append("private", "*")
    formData.append("format", "xlsx")
    formData.append("importFormat", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    formData.append("resourceContext", componentURL)
    formData.append("vvc.configuration", changesetURL)
    formData.append("moduleUrl", moduleURL)
    formData.append("iFrameRequest", "true")
    formData.append("updateMatched", true)
    formData.append("createUnmatched", true)

    const requestOptions = {
        method: "POST",
        body: formData,
        redirect: "follow",
    }

    let response, response2

    try {
        response = await fetch(hostContext + "/" + importFormatUrl + componentURL + "&vvc.configuration=" + changesetURL, requestOptions)
    } catch (err) {
        throw err
    }

    const text = await response.text()
    const xml = new DOMParser().parseFromString(text, "application/xml")

    if (!response?.ok) {
        throw new Error(xml.documentElement.textContent)
    }

    const importedDataSet = xml.getElementsByTagName("importedDataSet")[0].getAttribute("url")

    const myHeaders = new Headers()
    myHeaders.append("Content-Type", "application/x-www-form-urlencoded")
    myHeaders.append("DoorsRP-Request-Type", "private")
    myHeaders.append("X-Requested-With", "XMLHttpRequest")
    myHeaders.append("net.jazz.jfs.owning-context", componentURL)
    myHeaders.append("vvc.configuration", changesetURL)

    const requestOptions2 = {
        method: "POST",
        headers: myHeaders,
        redirect: "follow",
    }

    try {
        response2 = await fetch(hostContext + "/" + importFormatUrl + componentURL + "&vvc.configuration=" + changesetURL + "&importedDataSet=" + importedDataSet, requestOptions2)
    } catch (err) {
        throw err
    }

    const text2 = await response2.text()
    const xml2 = new DOMParser().parseFromString(text2, "application/xml")

    if (!response2?.ok) {
        throw new Error(xml2.documentElement.textContent)
    }
}

// Import new artifacts parsed from pdf
export async function importArtifactsStylesheetIntoModule({ parsedArtsArray, headers, renderer, component, changesetURL, moduleURL, hostContext }) {
    const flattenAttrData = convertArrayOfObjectIntoArrayOfArray(parsedArtsArray)
    const { attrArr, customAttrs } = createArtifactAttrArray(headers)
    await checkAndCreateMissingAttributes(customAttrs, renderer, component)
    const xlsxFile = createXlsxFile(flattenAttrData, attrArr)

    try {
        await uploadFile({
            fileData: xlsxFile,
            componentURL: component.urlInProject,
            changesetURL: changesetURL,
            moduleURL,
            hostContext,
        })
    } catch (err) {
        console.log(err)
    }
}
