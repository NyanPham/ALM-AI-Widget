/**
 *  Use event system to process files from outer. When the file is uploaded, the form is dispatch a
 *  Custom Event called "filesubmit" that include the submitted form element as well as the file formData
 *  The outer processing functions should dispatch another Custom Event "upload-finish" on the submited form
 * 
 */

window.addEventListener("load", initFileInputs)

function showFiles(label, input, files) {
    label.textContent = files.length > 1 ? (input.getAttribute("data-multiple-caption") || "").replace("{count}", files.length) : files[0].name
}

function initFileInputs() {
    const isAdvancedUpload = () => {
        const div = document.createElement("div")
        return ("draggable" in div || ("ondragstart" in div && "ondrop" in div)) && "FormData" in window && "FileReader" in window
    }
    
    const forms = document.querySelectorAll("[data-file-input-form]")
    forms.forEach((form) => {
        const input = form.querySelector('input[type="file"]')
        const label = form.querySelector("label")
        const errorMsg = form.querySelector(".box__error span")
        const restartBtns = form.querySelectorAll(".box__restart")
        const submitBtn = form.querySelector("[data-submit-pdf-btn]")
        let droppedFiles = false

        const triggerFormSubmit = ({ formData, form }) => {
            const event = new CustomEvent("filesubmit", {
                detail: {
                    form: form, 
                    formData,
                },
            })
            form.dispatchEvent(event)
        }

        input.addEventListener("change", (e) => {
            showFiles(label, input, e.target.files)
            submitBtn.disabled = false
        })

        if (isAdvancedUpload) {
            form.classList.add("has-advanced-upload")
            ;["drag", "dragstart", "dragend", "dragover", "dragenter", "dragleave", "drop"].forEach((event) => {
                form.addEventListener(event, (e) => {
                    e.preventDefault()
                    e.stopPropagation()
                })
            })
            ;["dragover", "dragenter"].forEach((event) => {
                form.addEventListener(event, () => {
                    form.classList.add("is-dragover")
                })
            })
            ;["dragleave", "dragend", "drop"].forEach((event) => {
                form.addEventListener(event, () => {
                    form.classList.remove("is-dragover")
                })
            })

            form.addEventListener("drop", (e) => {
                droppedFiles = e.dataTransfer.files
                showFiles(label, input, droppedFiles)
                submitBtn.disabled = false
            })
        }

        form.addEventListener("submit", function (e) {
            if (form.classList.contains("is-uploading")) return false
            
            form.classList.add("is-uploading")
            form.classList.remove("is-error")

            if (isAdvancedUpload) {
                e.preventDefault()
                
                const formData = new FormData(form)
                if (droppedFiles) {
                    droppedFiles.forEach((file) => {
                        formData.append(input.getAttribute("name"), file)
                    })
                }

                triggerFormSubmit({ formData, form })
            }
        })      

        form.addEventListener("upload-finish", () => {
            form.classList.remove("is-uploading")
        })  

        restartBtns.forEach((restartBtn) => {
            restartBtn.addEventListener("click", (e) => {
                e.preventDefault()
                form.classList.remove("is-error", "is-success")
                input.click()
            })
        })

        // Firefox focus bug fix for file input
        input.addEventListener("focus", function () {
            input.classList.add("has-focus")
        })
        input.addEventListener("blur", function () {
            input.classList.remove("has-focus")
        })
    })
}
