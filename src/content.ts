import { FileTags, msgManager, MyMsg, ParsedImageInfo, supported_hostname_t } from "./common";
import { storageManager } from "./options";
import * as modules from './modules'
import { AbstractModule } from "./modules/abstract";

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

function getModuleInstance(): AbstractModule {
    switch (location.hostname as supported_hostname_t) {
        case 'chan.sankakucomplex.com': return new modules.ModuleChanSankakuComplexCom()
        case 'konachan.com': return new modules.ModuleKonachanCom()
        case 'konachan.net': return new modules.ModuleKonachanNet()
        case 'yande.re': return new modules.ModuleYandeRe()
        case 'danbooru.donmai.us': return new modules.ModuleDanbooruDonmaiUs()
        case 'rule34.xxx': return new modules.ModuleRule34XXX()
        case 'rule34.paheal.net': return new modules.ModuleRule34PahealNet()
        case 'rule34.us': return new modules.ModuleRule34Us()
        case 'gelbooru.com': return new modules.ModuleGelbooruCom()
        case 'booru.allthefallen.moe': return new modules.ModuleAllthefallenMoe()
        default: throw new Error('Not found module for this site.')
    }
}

const curMod = getModuleInstance()

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

if (curMod.inPostContentPage()) {
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

function insertStyleElement () {
    if (document.getElementById('BooruDownloader_Style')) {
        return console.log('[BooruDownloader] Style has inserted, aborted.')
    }
    const css = `
    #BooruDownloader_Float {
        position: fixed;
        right: 20px;
        top: 20px;
        background-color:  #fff;
        border: solid 1px #aaa;
        padding: 6px;
        z-index: 9999;
    }
    #BooruDownloader_Float button {
        font-size: 2em;
        background: #E9E9ED;
        border: 1px solid #aaaaaa;
        color: #000000;
        padding: 0.4em 1.2em;
        display: block;
        width: 100%;
    }
    `
    const style = document.createElement('style')
    document.head.appendChild(style)
    style.id = 'BooruDownloader_Style'
    style.type = 'text/css'
    style.appendChild(document.createTextNode(css));
}

async function showHideDownloadLinks() {
    const oriEl = document.getElementById('BooruDownloader_Float')
    console.log('show hide', oriEl)
    if (oriEl) {
        oriEl.remove()
        return
    }
    insertStyleElement()
    const root = document.createElement('div')
    root.id = "BooruDownloader_Float"
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
