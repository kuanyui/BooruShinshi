export function inPageNotify(title: string, msg: string, allowHtml: boolean = false, durMs: number = 2000) {
    console.log('inPageNotify', title, msg)
    const oriEl = document.getElementById('copyAsOrgModeNotify')
    if (oriEl) {
        oriEl.remove()
    }
    const rootEl = document.createElement('div')
    rootEl.id = 'booruShinshiNotification'
    rootEl.style.display = 'block'
    rootEl.style.position = 'fixed'
    rootEl.style.zIndex = '99999999999999999'
    rootEl.style.bottom = '16px'
    rootEl.style.right = '16px'
    rootEl.style.width = '500px'
    rootEl.style.minHeight = '80px'
    rootEl.style.padding = '8px'
    rootEl.style.backgroundColor = '#c3def0'
    rootEl.style.color = '#283f4f'
    rootEl.style.borderColor = '#283f4f'
    rootEl.style.borderStyle = 'solid'
    rootEl.style.borderWidth = '1px'
    rootEl.style.cursor = 'pointer'
    rootEl.style.overflowWrap = 'anywhere'
    // rootEl.style.overflowY = 'auto'
    rootEl.title = 'Click to close'
    function close() { rootEl.remove() }
    rootEl.onclick = close
    window.setTimeout(() => {
        close()
    }, durMs)
    // title
    if (title) {
        const titleEl = document.createElement('b')
        titleEl.style.display = 'flex'
        titleEl.style.alignItems = 'center'
        titleEl.style.fontSize = '20px'
        titleEl.style.backgroundColor = 'transparent'
        titleEl.style.color = '#283f4f'
        if (allowHtml) {
            titleEl.innerHTML = title
        } else {
            titleEl.innerText = title
        }
        // icon
        const imgEl = document.createElement('img')
        imgEl.src = browser.runtime.getURL('img/icon.png')
        imgEl.width = 20
        imgEl.height = 20
        titleEl.prepend(imgEl)
        rootEl.appendChild(titleEl)
    }
    // content
    const contentEl = document.createElement('p')
    contentEl.style.display = 'block'
    contentEl.style.whiteSpace = 'pre-wrap'
    contentEl.style.fontFamily = 'monospace'
    contentEl.style.fontSize = '12px'
    contentEl.style.lineHeight = '14px'
    contentEl.style.background = 'transparent'
    contentEl.style.color = '#283f4f'
    if (allowHtml) {
        contentEl.innerHTML = msg
    } else {
        contentEl.innerText = msg
    }
    // final
    rootEl.appendChild(contentEl)
    document.body.appendChild(rootEl)
}