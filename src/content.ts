import { MyMsg, msgManager, SELECTOR, FileTags, Tag, supported_hostname_t, isUrlSupported } from "./common";

browser.runtime.onMessage.addListener((_ev: any) => {
    const ev = _ev as MyMsg
    if (ev.type === "AskTabToDownload") {
        showHideDownloadLinks()
    }
})
function getHostname(): supported_hostname_t {
    return window.location.hostname as supported_hostname_t
}
if (isUrlSupported(location.href)) {
    const observer = new MutationObserver(function (mutations, me) {
        const watchElemArr: Array<Element | null> = []
        if (getHostname() === 'chan.sankakucomplex.com') {
            watchElemArr.push(document.querySelector('#image'))
            watchElemArr.push(document.querySelector('#tag-sidebar'))
            watchElemArr.push(document.querySelector('#stats'))
        } else {
            watchElemArr.push(document.querySelector('#tag-sidebar'))
            watchElemArr.push(document.querySelector('#highres'))
        }
        console.log('document changed!', watchElemArr)
        if (watchElemArr.every(x => !!x)) {
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



function getImageId (): number {
    const m = location.pathname.match(/\/post\/show\/([0-9]+)/)
    if (m) {return ~~m[1]}
    return -1
}

function getSiteAbbr (): string {
    switch (window.location.hostname as supported_hostname_t) {
        case 'chan.sankakucomplex.com': return 'SC'
        case 'konachan.com': return 'KC'
        case 'konachan.net': return 'KC'
        case 'yande.re': return 'YR'
    }
    return 'ERROR'
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

interface ImageInfo {
    btnText: string,
    imgUrl: string
}

function getImageInfoArr(): ImageInfo[] {
    const fin: ImageInfo[] = []

    const lo = document.querySelector('#lowres') as HTMLLinkElement | null
    const hi = document.querySelector('#highres') as HTMLLinkElement | null
    const png = document.querySelector('#png') as HTMLLinkElement | null
    const imgEl = document.querySelector('#image') as HTMLImageElement | null
    if (lo) {
        fin.push({ btnText: 'Low', imgUrl: lo.href })
    }
    if (hi) {
        const rawSize = hi.innerText.match(/\((.+)\)/)
        let size: string = ''
        if (rawSize) { size = rawSize[1] }
        fin.push({ btnText: `High (${size})`, imgUrl: hi.href })
    }
    if (png) {
        const rawSize = png.innerText.match(/\((.+)\)/)
        let size: string = ''
        if (rawSize) { size = rawSize[1] }
        fin.push({ btnText: `High PNG (${size})`, imgUrl: png.href })
    }
    if ((!lo && !hi && !png) && imgEl) {
        fin.push({ btnText: 'Low (fallback)', imgUrl: imgEl.src })
    }
    console.log(' ==================', fin)
    return fin
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
    const infoArr: ImageInfo[] = getImageInfoArr()
    const closer = () => root.remove()
    for (const info of infoArr) {
        const btn = document.createElement('button')
        btn.textContent = info.btnText
        btn.onclick = () => {
            downloadImage(info.imgUrl)
            closer()
        }
        root.appendChild(btn)
    }
    root.appendChild(document.createElement('hr'))
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
        studio: [],
        character: [],
        copyright: [],
        general: [],
    }
    const sidebar = document.querySelector('#tag-sidebar')
    if (!sidebar) {return fin}
    fin.copyright = collectTags(sidebar, SELECTOR.tagClass.copyright)
    fin.artist = collectTags(sidebar, SELECTOR.tagClass.artist)
    fin.character = collectTags(sidebar, SELECTOR.tagClass.character)
    fin.general = collectTags(sidebar, SELECTOR.tagClass.general)
    fin.studio = collectTags(sidebar, SELECTOR.tagClass.studio)
    console.log('file tags ==>', fin)
    return fin
}

function collectTags (fromEl: Element, tagLiClass: string): Tag[] {
    // const hostname = window.location.hostname as supported_hostname_t
    switch (window.location.hostname as supported_hostname_t) {
        case 'chan.sankakucomplex.com':
        return collectTags_sankaku(fromEl, tagLiClass)
        case 'konachan.com':
        case 'konachan.net':
        return collectTags_konachan(fromEl, tagLiClass)
        case 'yande.re':
        return collectTags_yandere(fromEl, tagLiClass)
    }
    console.error('[To Developer] This should not happened')
    return []
}

function collectTags_sankaku (fromEl: Element, tagLiClass: string): Tag[] {
    const fin: Tag[] = []
    let els = fromEl.querySelectorAll(tagLiClass)
    els.forEach((el) => {
        const keyEl = el.querySelector('a[itemprop="keywords"]')
        if (!keyEl || !keyEl.textContent) {return}
        const textContent = keyEl.textContent.replace(/ /g, '_')  // replace space with underline
        const countEl = el.querySelector('.post-count')
        if (!countEl || !countEl.textContent) {return}
        const count = ~~countEl.textContent
        const title = keyEl.getAttribute('title') || ''
        if (document.documentElement.lang === 'en') {
            fin.push({ ja: title, en: textContent, count })
        } else {
            fin.push({ ja: textContent, en: title, count })
        }
    })
    return fin
}

function collectTags_konachan (fromEl: Element, tagLiClass: string): Tag[] {
    const fin: Tag[] = []
    let els = fromEl.querySelectorAll(tagLiClass)
    els.forEach((el) => {
        const key = el.getAttribute('data-name')
        if (!key) {return}
        const countEl = el.querySelector('.post-count')
        if (!countEl || !countEl.textContent) {return}
        const count = ~~countEl.textContent
        fin.push({ en: key, count })
    })
    return fin
}

function collectTags_yandere (fromEl: Element, tagLiClass: string): Tag[] {
    const fin: Tag[] = []
    let els = fromEl.querySelectorAll(tagLiClass)
    els.forEach((el) => {
        const aList = el.querySelectorAll('a')
        if (aList.length < 2) { return }
        const key = aList[1].innerText.replace(/ /g, '_')  // replace space with underline
        if (!key) {return}
        const countEl = el.querySelector('.post-count')
        if (!countEl || !countEl.textContent) {return}
        const count = ~~countEl.textContent
        fin.push({ en: key, count })
    })
    return fin
}

const SEPARATOR = ','

function generateFileBaseName (): string {
    const tmp = getFileTags()
    const id = getImageId()
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
    const m = imgFileUrl.match(/\b[.](jpg|png|gif|bmp|webp|webm|mp4|mkv)\b/i)
    if (m) { return m[1] }
    return null
}

function generateFileName (imgFileUrl: string): string {
    const base = generateFileBaseName()
    const ext = guessExt(imgFileUrl)
    return `${base}.${ext}`
}
