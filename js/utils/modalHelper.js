import renderer from "../view/Renderer.js"

export async function confirmWithDialog({ title, html, text, confirmText = "Confirm" }) {
    const el = document.createElement("div")
    if (html) el.innerHTML = html
    if (text) el.innerText = text

    return await new Promise(async (resolve) => {
        await renderer.setGeneralDialogContent({
            title,
            content: el,
            submittable: true,
            submitText: confirmText,
            onSubmit: (e) => {
                if (renderer.isDialogCancelButton(e)) {
                    resolve(false)
                }

                resolve(true)
            },
            styles: {
                "min-height": "unset",
                "max-height": "unset",
                height: "max-content",
                "box-shadow": "none",
            },
        })

        renderer.showGeneralDialog()
    })
}
