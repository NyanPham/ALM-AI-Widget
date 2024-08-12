export const commonModalScript = {
    buildHeader({ draggable } = { draggable: true }) { 
        const header = document.createElement('div');
        header.classList.add('jazz-ui-Dialog-header');
        header.setAttribute('dojoattachpoint', 'headerContainerNode');

        const heading = document.createElement('div');
        heading.classList.add('jazz-ui-Dialog-heading');
        heading.innerText = this.title;
        header.style.userSelect = 'none';
        header.style.cursor = 'move';

        header.appendChild(heading);
        this.draggable = draggable;

        if (!this.draggable) return header;

        this.mouse = {
            x: 0,
            y: 0,
            pressed: false,
        };

        header.addEventListener('mousedown', (e) => {
            if (this.frontModal == null) return;

            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.mouse.pressed = true;
	
            if (getComputedStyle(this.frontModal).getPropertyValue('--top') === '') {
                this.frontModal.style.setProperty('--top', 0);
                this.frontModal.style.setProperty('--left', 0);
                this.frontModal.style.top = 'calc(var(--top) * 1px)';
                this.frontModal.style.left = 'calc(var(--left) * 1px)';
            }
        });

        header.addEventListener('mouseup', e => {
            if (this.frontModal == null) return;

            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
            this.mouse.pressed = false;
        });
        
        return header;
    },

    buildCloseButton() {
        const closeBtn = document.createElement('button');
        closeBtn.classList.add('jazz-ui-Dialog-close-button');
        closeBtn.setAttribute('dojoattachpoint', 'closeButton');

        const closeIcon = document.createElement('div');
        closeIcon.classList.add('jazz-ui-Dialog-close-button-icon');

        closeBtn.appendChild(closeIcon);

        return closeBtn;
    },

    buildRootOverlay() {
        const rootBgOverlay = document.createElement('div');
        rootBgOverlay.classList.add('jazz-ui-modalunderlay-root');
        rootBgOverlay.style.zIndex = '991';

        rootBgOverlay.addEventListener('mousemove', e => {
            if (!this.draggable || !this.mouse.pressed || this.frontModal == null) return;

            const distanceX = e.clientX - this.mouse.x;
            const distanceY = e.clientY - this.mouse.y;

            const styledModal = getComputedStyle(this.frontModal);

            const currentTop = parseFloat(styledModal.getPropertyValue('--top'));
            const currentLeft = parseFloat(styledModal.getPropertyValue('--left'));

            this.frontModal.style.setProperty('--top', currentTop + distanceY);
            this.frontModal.style.setProperty('--left', currentLeft + distanceX);

            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        rootBgOverlay.addEventListener('mouseup', () => {
            if (this.mouse?.pressed) this.mouse.pressed = false;
        })

        return rootBgOverlay;
    },
    
    buildFrontModal() {
        const frontModal = document.createElement('div');
        frontModal.classList.add('jazz-ui-Dialog');
        frontModal.classList.add('modal');
        frontModal.classList.add('front');
        frontModal.classList.add('front-modal');
        frontModal.style.zIndex = '1000';   

        return frontModal;  
    },  

    buildModalUnderlay() {
        const modalUnderlay = document.createElement('div');
        modalUnderlay.classList.add('jazz-ui-modalunderlay-modal');
        modalUnderlay.style.zIndex = '995';

        return modalUnderlay;
    },

    buildLoadingLayer() {
        const loadingLayer = document.createElement('div');
        loadingLayer.innerText = 'Requesting service...';
        loadingLayer.style.display = 'flex';
        loadingLayer.style.alignItems = 'center';
        loadingLayer.style.justifyContent = 'center';
        loadingLayer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        loadingLayer.style.color = 'white';
        loadingLayer.style.fontSize = '24px'

        loadingLayer.style.position = 'fixed';
        loadingLayer.style.top = '0';
        loadingLayer.style.left = '0';
        loadingLayer.style.width = '100%';
        loadingLayer.style.height = '100%';

        return loadingLayer;
    },  

    buildContent() {
        let el = this.contentElement;

        if (typeof this.contentElement === 'string') {
            el = document.createElement('div');
            el.style.maxHeight = '50vh';
            el.innerText = this.contentElement;
        }   
        
        const contentEl = document.createElement('div');
        contentEl.classList.add('jazz-ui-Dialog-content');
        contentEl.classList.add('jazz-ui-Dialog-content-padding-full');
        contentEl.appendChild(el);

        el.style.maxWidth = '70vw';
        el.style.width = '804px';
        
        return contentEl;
    },

    buildFooter({ submittable = true, cancellable = true } = {}) {
        if (!submittable && !cancellable) return null;
        
        const footerStr = `
            <div class="jazz-ui-Dialog-footer" dojoattachpoint="footerContainerNode">
                <div data-dojo-attach-point="_footerNode" class="j-buttonGroup-bleed-two">	
                    <button class="j-button-secondary" type="button" ${!cancellable ? 'style="opacity: 0; pointer-events: none;" disabled' : ''}>Cancel</button>
                    <button class="j-button-primary" type="submit" ${!submittable ? 'style="opacity: 0; pointer-events: none;" disabled' : ''}>OK</button>
                </div>
            </div>`         
        const footer = new DOMParser().parseFromString(footerStr, 'text/html');
        return footer.documentElement.querySelector('.jazz-ui-Dialog-footer'); 
    },

    destroy() {
        this.modalUnderlay.classList.remove('is-visible');
        this.rootBgOverlay.classList.remove('is-visible');
        this.frontModal.classList.remove('is-visible');

        this.isDestroying = true;

        setTimeout(() => {
            this.rootBgOverlay.remove();
        }, 800);  
    },
}