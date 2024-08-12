class ListWithPagination {
    #listElem
    #listItemElems
    #paginateButtons
    #nextButton
    #prevButton
    #pageSize
    #currentPageNum
    #pageTotal
    #container

    constructor(listItemElems, containerId, { pageSize = 30 } = {}) {
        this.#listElem = document.createElement("ul")
        this.#listElem.classList.add("paginated-ul")

        this.#listItemElems = listItemElems
        this.#pageSize = pageSize
        this.#currentPageNum = 0
        this.#pageTotal = Math.floor(this.#listItemElems.length / this.#pageSize)

        this.buildPaginationButtons()

        this.#container = document.getElementById(containerId)
        this.#container.appendChild(this.#paginateButtons)
        this.#container.appendChild(this.#listElem)

        this.paginate()
    }

    toPage(pageNum) {
        this.#currentPageNum = pageNum
        this.paginate()
    }

    nextPage() {
        this.#currentPageNum++
        this.paginate()
    }

    prevPage() {
        this.#currentPageNum--
        this.paginate()
    }

    paginate() {
        while (this.#listElem.firstChild) {
            this.#listElem.removeChild(this.#listElem.firstChild)
        }

        const startIndex = this.#currentPageNum * this.#pageSize
        const endIndex = Math.min(startIndex + this.#pageSize, this.#listItemElems.length)

        if (startIndex > endIndex) {
            throw new Error("Pagination Error: Start Index is larger than End Index")
        }

        if (startIndex > this.#listItemElems.length - 1 || endIndex > this.#listItemElems.length) {
            throw new Error("Pagination Error: Either Start Index or End Index is invalid")
        }

        const itemsToRender = this.#listItemElems.slice(startIndex, endIndex)

        itemsToRender.forEach((item) => {
            this.#listElem.appendChild(item)
        })

        this.renderPaginateButtons()
    }

    renderPaginateButtons() {
        this.#prevButton.disabled = this.#currentPageNum === 0
        this.#nextButton.disabled = this.#currentPageNum >= this.#pageTotal

        const currentPageNumEl = this.#paginateButtons.querySelector("[data-current-page-num]")
        currentPageNumEl.innerHTML = this.#currentPageNum + 1
    }

    buildPaginationButtons() {
        this.#paginateButtons = document.createElement("div")
        this.#paginateButtons.classList.add("paginate-meta")

        const paginationInfo = document.createElement("div")
        paginationInfo.innerHTML = "Page "

        const currentPageNumEl = document.createElement("span")
        currentPageNumEl.dataset.currentPageNum = 0
        currentPageNumEl.innerHTML = 1
        
        const totalPage = document.createElement("span")
        totalPage.innerHTML = ` / ${this.#pageTotal + 1}`

        paginationInfo.appendChild(currentPageNumEl)
        paginationInfo.appendChild(totalPage)

        const buttonGrid = document.createElement("div")
        buttonGrid.classList.add("btn-grids")

        this.#nextButton = document.createElement("button")
        this.#nextButton.setAttribute("type", "button")
        this.#nextButton.classList.add('btn')
        this.#nextButton.innerHTML = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"/></svg>'
        this.#prevButton = document.createElement("button")
        this.#prevButton.setAttribute("type", "button")
        this.#prevButton.classList.add('btn')
        this.#prevButton.innerHTML = '<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512"><path d="M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"/></svg>'
        
        buttonGrid.appendChild(this.#prevButton)
        buttonGrid.appendChild(this.#nextButton)

        this.#paginateButtons.appendChild(paginationInfo)
        this.#paginateButtons.appendChild(buttonGrid)

        this.#nextButton.addEventListener("click", this.nextPage.bind(this))
        this.#prevButton.addEventListener("click", this.prevPage.bind(this))
    }
}

export default ListWithPagination
