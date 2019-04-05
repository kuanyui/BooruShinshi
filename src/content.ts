import { MyMsg, msgManager, SankakuComplex, FileTags, Tag } from "./common";

browser.runtime.onMessage.addListener((_ev: any) => {
    const ev = _ev as MyMsg
    if (ev.type === "AskTabToDownload") {
        showHideDownloadLinks()
        // const res: MyMsg = { type: "Success" }
        // console.log('send to background~', res)
        // return Promise.resolve(res)
    }
})
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
    }
    #BooruDownloader_Float * {
        font-size: 2em;
    }
    `
    const style = document.createElement('style')
    document.head.appendChild(style)
    style.id = 'BooruDownloader_Style'
    style.type = 'text/css'
    style.appendChild(document.createTextNode(css));
}
function showHideDownloadLinks () {
    const origEl = document.getElementById('BooruDownloader_Float')
    if (origEl) {
        origEl.remove()
        return
    }
    insertStyleElement()
    const root = document.createElement('div')
    root.id = "BooruDownloader_Float"
    const lo = document.querySelector('#lowres') as HTMLLinkElement | null
    const hi = document.querySelector('#highres') as HTMLLinkElement | null
    const closer = () => root.remove()
    if (lo) {
        const btn = document.createElement('button')
        btn.textContent = 'Low Resolution'
        btn.onclick = () => {
            downloadImage(lo.href)
            closer()
        }
        root.appendChild(btn)
    }
    if(hi) {
        const btn = document.createElement('button')
        btn.textContent = 'High Resolution'
        btn.onclick = () => {
            downloadImage(hi.href)
            closer()
        }
        root.appendChild(btn)
    }
    const closeBtn = document.createElement('button')
    closeBtn.textContent = 'X'
    closeBtn.onclick = () => closer()
    root.appendChild(closeBtn)

    document.body.appendChild(root)
}
function downloadImage (imgFileUrl: string) {
    msgManager.sendToBg({
        type: 'DownloadLinkGotten',
        url: imgFileUrl,
        filename: generateFileName(imgFileUrl)
    })
}

function getFileTags (): FileTags {
    const fin: FileTags = {
        artist: [],
        character: [],
        copyright: [],
        general: [],
    }
    const sidebar = document.querySelector('#tag-sidebar')
    if (!sidebar) {return fin}
    fin.copyright = collectTags(sidebar, SankakuComplex.tagClass.copyright)
    fin.artist = collectTags(sidebar, SankakuComplex.tagClass.artist)
    fin.character = collectTags(sidebar, SankakuComplex.tagClass.character)
    fin.general = collectTags(sidebar, SankakuComplex.tagClass.general)
    console.log('file tags ==>', fin)
    return fin
}

function collectTags (fromEl: Element, tagLiClass: string): Tag[] {
    const fin: Tag[] = []
    let els = fromEl.querySelectorAll(tagLiClass)
    // console.log('els================>', els)
    els.forEach((el) => {
        const tagEl = el.querySelector('[itemprop="keywords"]')
        if (!tagEl || !tagEl.textContent) {return}
        const key = tagEl.textContent.replace(/ /g, '_')  // replace space with underline
        const countEl = el.querySelector('.post-count')
        if (!countEl || !countEl.textContent) {return}
        const count = ~~countEl.textContent
        const title = tagEl.getAttribute('title')  // title may be undefined
        fin.push({ key, title, count })
    })
    return fin
}

const SEPARATOR = ','

function generateFileBaseName (): string {
    const tmp = getFileTags()
    const artist: string = tmp.artist[0] ? `[${tmp.artist[0].key}]` : '[unknow artist]'
    const copyright: string = tmp.copyright[0] ? `[${tmp.copyright[0].key}]` : '[no series]'
    const character: string = tmp.character[0] ? `[${tmp.character[0].key}]` : ''
    const sortedGeneral = tmp.general.sort((a, b) => a.count - b.count)
    let general: string = ''
    for (const x of sortedGeneral) {
        if (general.length > 50) { break }
        general = general + SEPARATOR + x.key
    }
    general = general.slice(1)
    return `${artist}${copyright}${character}${general}`
}

/** Return ext without dot. */
function guessExt (imgFileUrl: string): string | null {
    const m = imgFileUrl.match(/\b[.](jpg|png|gif|bmp|webp|webm|mp4|mkv)\b/i)
    if (m) { return m[1] }
    return null
}

function generateFileName (imgFileUrl: string): string {
    const base = generateFileBaseName()
    const ext = guessExt(imgFileUrl)
    return `${base}.${ext}`
}
