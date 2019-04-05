import { MyMsg, msgManager, SankakuComplex, FileTags, Tag } from "./common";

browser.runtime.onMessage.addListener((_ev: any) => {
    const ev = _ev as MyMsg
    if (ev.type === "AskTabToDownload") {
        downloadImage()
        // const res: MyMsg = { type: "Success" }
        // console.log('send to background~', res)
        // return Promise.resolve(res)
    }
})

function downloadImage () {
    const lo = document.querySelector('#lowres') as HTMLLinkElement
    const hi = document.querySelector('#highres') as HTMLLinkElement
    console.log('lo.href', lo.href)
    msgManager.sendToBg({
        type: 'DownloadLinkGotten',
        url: lo.href,
        filename: generateFileName(lo.href)
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
        const key = tagEl.textContent
        const countEl = el.querySelector('.post-count')
        if (!countEl || !countEl.textContent) {return}
        const count = ~~countEl.textContent
        // title may be undefined
        const title = tagEl.getAttribute('title')
        // console.log('======>', tagEl, countEl, title)
        fin.push({ key, title, count })
    })
    return fin
}

function generateFileBaseName (): string {
    const tmp = getFileTags()
    let artist: string
    if (tmp.artist[0]) {
        artist = tmp.artist[0].key
    } else {
        artist = 'unknown artist'
    }
    return `[${artist}]`
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
