const selectBtns = [...document.querySelectorAll("[data-custom-select-button]")]
const customSelects = [...document.querySelectorAll("[data-custom-select]")]
const optionsLists = [...document.querySelectorAll("[data-select-dropdown]")]

document.addEventListener("click", (e) => {
    let clickedCustomSelect
    if (e.target.matches("[data-custom-select]")) {
        clickedCustomSelect = e.target
    } else if (e.target.closest("[data-custom-select]") != null) {
        clickedCustomSelect = e.target.closest("[data-custom-select]") 
    }

    if (clickedCustomSelect == null) {
        customSelects.forEach((customSelect) => {
            customSelect.classList.remove("active")
        })

        selectBtns.forEach((btn) => {
            btn.setAttribute("aria-expanded", false)
        })

        return 
    }
    
    customSelects.forEach(customSelect => {
        if (customSelect == clickedCustomSelect) return 
        customSelect.classList.remove("active")
    })

    selectBtns.forEach((btn) => {
        const customSelect = btn.closest("[data-custom-select]")
        if (customSelect == clickedCustomSelect) return 

        btn.setAttribute("aria-expanded", false)
    })
})

let searchString = ""
let searchDebounce
document.addEventListener("keypress", (e) => {
    let customSelect

    if (e.target.matches("[data-custom-select]")) customSelect = e.target
    else if (e.target.closest("[data-custom-select]") != null) customSelect = e.target.closest("[data-custom-select]")

    if (customSelect == null) return

    searchString += e.key

    if (searchDebounce != null) {
        clearTimeout(searchDebounce)
    }

    searchDebounce = setTimeout(() => {
        const foundOption = [...customSelect.querySelectorAll("[data-select-option]")].find((selectOption) => selectOption.textContent?.trim().toLowerCase().startsWith(searchString.toLowerCase()))

        if (foundOption) {
            foundOption.scrollIntoView({ block: "start", behavior: "smooth" })
        }

        searchString = ""
    }, 350)
})

selectBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
        const customSelect = e.target.closest("[data-custom-select]")
        if (customSelect == null) return

        customSelect.classList.toggle("active")
        btn.setAttribute("aria-expanded", btn.classList.contains("active"))
    })
})

function optionSelectHandler(e) {
    if (e.type === "click") {
        e.stopPropagation()

        if (!e.target.matches("label")) return null

        const customSelect = e.target.closest("[data-custom-select]")
        const selectedValue = customSelect.querySelector("[data-selected-value]")
        let selectOption

        if (e.target.matches("[data-select-option]")) {
            selectOption = e.target
        } else if (e.target.closest("[data-select-option]") != null) {
            selectOption = e.target.closest("[data-select-option]")
        }

        if (selectOption == null) return
        selectedValue.innerText = selectOption.querySelector("label").innerText
        selectedValue.dataset.selectedValue = selectOption.querySelector("input").value
        customSelect.classList.remove("active")
        customSelect.dispatchEvent(new Event("change"))
    }

    if (e.key === "Enter") {
    }
}

optionsLists.forEach((optionList) => {
    optionList.addEventListener("click", optionSelectHandler)
})
