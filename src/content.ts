import { FileTags, msgManager, MyMsg, ParsedImageInfo, supported_hostname_t } from "./common";
import { storageManager } from "./options";
import * as modules from './modules'
import { AbstractModule } from "./modules/abstract";

const ALL_MODULES: AbstractModule[] = [
     new modules.ModuleChanSankakuComplexCom(),
     new modules.ModuleKonachanCom(),
     new modules.ModuleKonachanNet(),
     new modules.ModuleYandeRe(),
     new modules.ModuleDanbooruDonmaiUs(),
     new modules.ModuleRule34XXX(),
     new modules.ModuleRule34PahealNet(),
     new modules.ModuleRule34Us(),
     new modules.ModuleGelbooruCom(),
     new modules.ModuleAllthefallenMoe(),
]

function getModuleInstance(): AbstractModule {
    for (const m of ALL_MODULES) {
        if (m.hostname() === location.hostname) {
            return m
        }
    }
    throw new Error('Not found module for this site.')
}

const curMod = getModuleInstance()

browser.runtime.onMessage.addListener((_ev: any) => {
    const ev = _ev as MyMsg
    if (ev.type === "AskTabToDownload") {
        showHideDownloadLinks()
    }
})
storageManager.getData().then((opts) => {
    if (opts.openLinkWithNewTab) {
        makeImgAlwaysOpenedWithNewTab()
    }
})

function makeImgAlwaysOpenedWithNewTab() {
    const selector: string = curMod.getPostLinkElementSelector()
    window.setTimeout(() => {
        document.querySelectorAll(selector).forEach(x => { _makeAnchorElementOpenedWithTab(x) })
    }, 3000)
    let timeoutId = -1
    const observer = new MutationObserver(function (mutations, me) {
        console.log('mutations', mutations)
        // mutations.forEach(mut => mut.target.querySelectorAll(selector).forEach(x => { x.setAttribute('target', '_blank') }))
        // Debounce timeout
        window.clearTimeout(timeoutId)
        window.setTimeout(() => {
            document.querySelectorAll(selector).forEach(x => { _makeAnchorElementOpenedWithTab(x) })
        }, 2000)
    })
    observer.observe(window.document, {
        childList: true,
        subtree: true
    })
}


function _makeAnchorElementOpenedWithTab(el: Element) {
    const a = el as HTMLAnchorElement
    // el.setAttribute('target', '_blank')
    if (!a.href) { return }
    // @ts-ignore
    a.onclick = function (ev) {
        console.log('Shit', Date.now())
        ev.preventDefault()
        ev.stopPropagation()
        // Open with new tab, but don't focus to the new tab.
        msgManager.sendToBg({ type: 'OpenLinkInNewTab', url: a.href })
    }
}
function insertStyleElement () {
    if (document.getElementById('BooruShinshi_Style')) {
        return console.log('[BooruShinshi] Style has inserted, aborted.')
    }
    const css = `
    #BooruShinshi_DivForContentPage {
        position: fixed;
        right: 20px;
        top: 20px;
        background-color:  #fff;
        border: solid 1px #aaa;
        padding: 6px;
        z-index: 9999;
    }
    #BooruShinshi_DivForContentPage button {
        cursor: pointer;
        font-size: 2em;
        background: #E9E9ED;
        border: 1px solid #aaaaaa;
        color: #000000;
        padding: 0.4em 1.2em;
        display: block;
        width: 100%;
    }
    #BooruShinshi_DivForListPage {
        display: flex;
        flex-direction: column;
        position: fixed;
        left: 20px;
        bottom: 20px;
        background-color:  #fff;
        border: solid 1px #aaa;
        padding: 6px;
        z-index: 9999;
    }
    #BooruShinshi_DivForListPage button {
        cursor: pointer;
        font-size: 20px;
        background: #E9E9ED;
        border: 1px solid #aaaaaa;
        color: #000000;
        padding: 10px 20px;
        display: block;
        width: 100%;
    }
    #BooruShinshi_DivForListPage .LinksContainer {
        display: flex;
        flex-direction: column;
    }
    #BooruShinshi_DivForListPage .LinksContainer a {
        display: flex;
        text-decoration: none;
        font-size: 14px;
        padding: 8px 8px;
        color: #3388ff;
    }
    #BooruShinshi_DivForListPage .LinksContainer a:hover:not(.currentSite) {
        background: #eeeeee;
    }
    #BooruShinshi_DivForListPage .LinksContainer a:visited {
        color: #8833ff;
    }
    #BooruShinshi_DivForListPage .LinksContainer a.currentSite {
        color: #aaaaaa;
        cursor: not-allowed;
    }
    `
    const style = document.createElement('style')
    document.head.appendChild(style)
    style.id = 'BooruShinshi_Style'
    style.type = 'text/css'
    style.appendChild(document.createTextNode(css));
}

function downloadImage (imgFileUrl: string) {
    msgManager.sendToBg({
        type: 'DownloadLinkGotten',
        url: imgFileUrl,
        filename: generateFileName(imgFileUrl)
    })
}

const SEPARATOR = ','

function generateFileBaseName (): string {
    const tmp = curMod.collectTags()
    const id = curMod.getPostId()
    const artist: string = tmp.artist[0] ? `[${tmp.artist[0].en}]` : ''
    const studio: string = tmp.studio[0] ? `[${tmp.studio[0].en}]` : ''
    const copyright: string = tmp.copyright[0] ? `[${tmp.copyright[0].en}]` : '[no series]'
    const character: string = tmp.character[0] ? `[${tmp.character[0].en}]` : ''
    const sortedGeneral = tmp.general.sort((a, b) => a.count - b.count)
    const artistOrStudio: string = artist || studio || '[unknown artist]'
    let general: string = ''
    for (const x of sortedGeneral) {
        if (general.length > 63) { break }
        general = general + SEPARATOR + x.en
    }
    general = general.slice(1)
    return `${id}${artistOrStudio}${copyright}${character}${general}`
}

/** Return ext without dot. */
function guessExt (imgFileUrl: string): string | null {
    const m = imgFileUrl.match(/\b[.](jpe?g|png|gif|bmp|webp|webm|mp4|mkv)\b/i)
    if (m) { return m[1] }
    return null
}

function generateFileName (imgFileUrl: string): string {
    const base = generateFileBaseName()
    const ext = guessExt(imgFileUrl)
    return `${base}.${ext}`
}

async function showHideDownloadLinks() {
    const oriEl = document.getElementById('BooruShinshi_DivForContentPage')
    console.log('show hide', oriEl)
    if (oriEl) {
        oriEl.remove()
        return
    }
    insertStyleElement()
    const root = document.createElement('div')
    root.id = "BooruShinshi_DivForContentPage"
    const infoArr: ParsedImageInfo[] = curMod.collectImageInfoList()
    if ((await storageManager.getData()).buttonForCloseTab) {
        const closeTab = document.createElement('button')
        closeTab.textContent = 'Close Tab'
        closeTab.onclick = () => msgManager.sendToBg({ type: 'CloseTab' })
        root.appendChild(closeTab)
        root.appendChild(document.createElement('hr'))
    }
    const buttonHidder = () => root.remove()
    for (const info of infoArr) {
        const btn = document.createElement('button')
        btn.textContent = info.btnText
        btn.onclick = () => {
            downloadImage(info.imgUrl)
            if (!btn.textContent!.startsWith('✔')) {
                btn.textContent = '✔' + btn.textContent
            }
        }
        root.appendChild(btn)
    }
    root.appendChild(document.createElement('hr'))
    const hideBtn = document.createElement('button')
    hideBtn.textContent = 'Hide Buttons'
    hideBtn.onclick = () => buttonHidder()
    root.appendChild(hideBtn)

    document.body.appendChild(root)
}

function createJumpButton() {
    const oriEl = document.getElementById('BooruShinshi_DivForListPage')
    if (oriEl) {
        oriEl.remove()
        return
    }
    insertStyleElement()
    const root = document.createElement('div')
    root.id = "BooruShinshi_DivForListPage"

    const jumpBtn = document.createElement('button')
    jumpBtn.textContent = 'Search in Other Sites'
    const linksContainer = document.createElement('div')
    linksContainer.className = 'LinksContainer'
    linksContainer.style.display = 'none'
    root.appendChild(linksContainer)
    root.appendChild(jumpBtn)

    const queriedTags = curMod.getCurrentQueryList()
    for (const mod of ALL_MODULES) {
        const a = document.createElement('a')
        a.textContent = mod.hostname()
        a.href = mod.makeQueryUrl(queriedTags)
        if (mod.hostname() === location.hostname) {
            a.classList.add('currentSite')
            a.textContent += ' (Current)'
        }
        linksContainer.appendChild(a)
    }
    let expanded = false
    jumpBtn.onclick = () => {
        expanded = !expanded
        linksContainer.style.display = expanded ? 'flex' : 'none'
    }
    root.appendChild(jumpBtn)

    document.body.appendChild(root)
}

function setupPostContentPage() {
    console.log('[Post Content] setup for post content page')
    const observer = new MutationObserver(function (mutations, me) {
        const watchElemArr: Array<Element | null> = curMod.getPostContentPagePendingElements()
        console.log('document changed!', watchElemArr)
        if (watchElemArr.every(x => !!x)) {
            console.log('document with key elements rendered!', watchElemArr)
            me.disconnect() // stop observing
            showHideDownloadLinks()
            return
        }
    })
    observer.observe(document, {
        childList: true,
        subtree: true
    })
}

function setupPostListPage() {
    console.log('[Post List] setup for post list page')
    const observer = new MutationObserver(function (mutations, me) {
        if (document.body) {
            createJumpButton()
            me.disconnect()
        }
    })
    observer.observe(document, {
        childList: true,
        subtree: true
    })
}

if (curMod.inPostContentPage()) {
    setupPostContentPage()
} else if (curMod.inPostListPage()) {
    setupPostListPage()
}