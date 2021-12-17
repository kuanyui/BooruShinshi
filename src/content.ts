import { MyMsg, msgManager, COMMON_SELECTOR, FileTags, Tag, supported_hostname_t, isUrlSupported, FileTagsElementClass, objectKeys, ALL_TAG_CATEGORY } from "./common";

browser.runtime.onMessage.addListener((_ev: any) => {
    const ev = _ev as MyMsg
    if (ev.type === "AskTabToDownload") {
        showHideDownloadLinks()
    }
})
function getHostname(): supported_hostname_t {
    return window.location.hostname as supported_hostname_t
}
export function makeImgAlwaysOpenedWithNewTab() {
    let selector: string = ''
    switch (getHostname()) {
        case 'chan.sankakucomplex.com': selector = 'span.thumb > a'; break
        case 'yande.re': selector = '#post-list-posts a.thumb'; break
        case 'konachan.com': selector = '#post-list-posts a.thumb'; break
        case 'konachan.net': selector = '#post-list-posts a.thumb'; break
        case 'danbooru.donmai.us': selector = '.post-preview-link'; break
        case 'rule34.xxx': selector = '#post-list .content span.thumb a'; break
        case 'rule34.paheal.net': selector = 'a.shm-thumb-link'; break
        case 'rule34.us': selector = '.thumbail-container a'; break
    }
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

makeImgAlwaysOpenedWithNewTab()

function _makeAnchorElementOpenedWithTab(el: Element) {
    const a = el as HTMLAnchorElement
    // el.setAttribute('target', '_blank')
    if (!a.href) { return }
    a.onclick = function (ev) {
        // Open with new tab, but don't focus to the new tab.
        msgManager.sendToBg({ type: 'OpenLinkInNewTab', url: a.href })
        ev.preventDefault()
        ev.stopPropagation()
    }
}

if (isUrlSupported(location.href)) {
    const observer = new MutationObserver(function (mutations, me) {
        const watchElemArr: Array<Element | null> = []
        switch (getHostname()) {
            case 'chan.sankakucomplex.com': {
                watchElemArr.push(document.querySelector('#image'))
                watchElemArr.push(document.querySelector('#tag-sidebar'))
                watchElemArr.push(document.querySelector('#stats'))
                break
            }
            case 'konachan.com':
            case 'konachan.net':
            case 'yande.re': {
                watchElemArr.push(document.querySelector('#tag-sidebar'))
                watchElemArr.push(document.querySelector('#highres'))
                break
            }
            case 'danbooru.donmai.us': {
                watchElemArr.push(document.querySelector('#image'))
                watchElemArr.push(document.querySelector('#tag-list'))
                watchElemArr.push(document.querySelector('#post-info-size'))
                break
            }
            case 'rule34.xxx': {
                watchElemArr.push(document.querySelector('#image'))
                watchElemArr.push(document.querySelector('#tag-sidebar'))
                break
            }
            case 'rule34.paheal.net': {
                watchElemArr.push(document.querySelector('#main_image'))
                watchElemArr.push(document.querySelector('#Tagsleft'))
                watchElemArr.push(document.querySelector('#ImageInfo'))
                break
            }
            case 'rule34.us': {
                watchElemArr.push(document.querySelector('.content_push > img'))
                watchElemArr.push(document.querySelector('#tag-list\\ '))
                watchElemArr.push(document.querySelector('#comment_form'))
                break
            }
        }
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



function getImageId(): number {
    const u = new URL(location.href)
    switch (getHostname()) {
        case 'chan.sankakucomplex.com':
        case 'konachan.com':
        case 'konachan.net':
        case 'yande.re': {
            const m = location.pathname.match(/\/post\/show\/([0-9]+)/)
            if (m) {return ~~m[1]}
        }
        case 'danbooru.donmai.us': {
            const m = location.pathname.match(/\/posts\/([0-9]+)/)
            if (m) {return ~~m[1]}
        }
        case 'rule34.xxx': {
            const id = u.searchParams.get('id')
            if (id) { return ~~id }
        }
        case 'rule34.paheal.net': {
            const m = location.pathname.match(/\/post\/view\/([0-9]+)/)
            if (m) {return ~~m[1]}
        }
        case 'rule34.us': {
            const id = u.searchParams.get('id')
            if (id) { return ~~id }
        }
    }
    return -1
}

function getSiteAbbr (): string {
    switch (getHostname()) {
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
    const hostName = getHostname()
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
    console.log('host===', hostName)
    if (hostName === 'danbooru.donmai.us') {
        const sizeEl = document.querySelector('#post-info-size')
        if (sizeEl) {
            const a = sizeEl.querySelector('a')!
            const size: string = a.textContent!
            fin.push({ btnText: `High (${size})`, imgUrl: a.href })
        }
    }
    if (hostName === 'rule34.xxx') {
        for (const _a of Array.from(document.querySelectorAll('.link-list a'))) {
            const a = _a as HTMLLinkElement
            if (!a.textContent) { continue }
            if (a.textContent.includes('Original image')) {
                const size: string = Array.from(document.querySelector('#stats')!.querySelectorAll('li')).find(x=>x.textContent && x.textContent.includes('Size: '))!.textContent!
                fin.push({ btnText: `High (${size})`, imgUrl: a.href })
            }
        }
    }
    if (hostName === 'rule34.paheal.net') {
        const mainImg = document.querySelector('#main_image') as HTMLImageElement
        fin.push({ btnText: `Low (fallback)`, imgUrl: mainImg.src })
        const infoEl = document.querySelector('#ImageInfo')!
        const tds = Array.from(infoEl.querySelectorAll('td'))
        const sizeTd = tds.find(td => td.textContent!.match(/[KMG]B/))
        const size: string = !sizeTd ? 'Unknown Size' : sizeTd.textContent!.match(/([0-9.]+[KMG]B)/)![1]
        const imgLinkTd = tds.find(td => td.textContent!.match(/File Only/))
        const imgLink = imgLinkTd!.querySelector('a')!
        fin.push({ btnText: `High (${size})`, imgUrl: imgLink.href })
    }
    if (hostName === 'rule34.us') {
        const imgEl = document.querySelector('.content_push img') as HTMLImageElement
        if (imgEl) {
            fin.push({ btnText: 'Low (fallback)', imgUrl: imgEl.src })
        }
        document.querySelectorAll('#tag-list\\  > a').forEach((_a) => {
            const a = _a as HTMLAnchorElement
            if (!a.textContent) { return }
            if (a.textContent.trim() === 'Original') {
                fin.push({ btnText: 'High (Original)', imgUrl: a.href })
            }
        })
    }

    console.log('getImageInfoArr ==================', fin)
    return fin
}

function showHideDownloadLinks() {
    const oriEl = document.getElementById('BooruDownloader_Float')
    console.log('show hide', oriEl)
    if (oriEl) {
        oriEl.remove()
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
            if (!btn.textContent!.startsWith('✔')) {
                btn.textContent = '✔' + btn.textContent
            }
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

function makeEmptyFileTags(): FileTags {
    return {
        copyright: [],
        artist: [],
        character: [],
        general: [],
        studio: [],
        meta: [],
    }
}
function getFileTags (): FileTags {
    // const hostname = window.location.hostname as supported_hostname_t
    switch (window.location.hostname as supported_hostname_t) {
        case 'chan.sankakucomplex.com':
            return collectTags_sankaku()
        case 'konachan.com':
        case 'konachan.net':
            return collectTags_konachan()
        case 'yande.re':
            return collectTags_yandere()
        case 'danbooru.donmai.us':
            return collectTags_danbooru()
        case 'rule34.xxx':
            return collectTags_rule34xxx()
        case 'rule34.paheal.net':
            return collectTags_rule34paheal()
        case 'rule34.us':
            return collectTags_rule34us()
    }
    console.error('[To Developer] This should not happened')
    return makeEmptyFileTags()
}

function collectTags_sankaku(): FileTags {
    const sidebarEl = document.querySelector('#tag-sidebar')
    const fileTags: FileTags = makeEmptyFileTags()
    if (!sidebarEl) {
        console.error('[To Developer] Not found tag')
        return fileTags
    }
    const meta: FileTagsElementClass = COMMON_SELECTOR.tagClass
    for (const tagCategory of ALL_TAG_CATEGORY) {
        const tagLiClass = meta[tagCategory]
        const tagsOfCategory: Tag[] = []
        let els = sidebarEl.querySelectorAll(tagLiClass)
        els.forEach((el) => {
            const keyEl = el.querySelector('a[itemprop="keywords"]')
            if (!keyEl || !keyEl.textContent) {return}
            const textContent = keyEl.textContent.replace(/ /g, '_')  // replace space with underline
            const countEl = el.querySelector('.post-count')
            if (!countEl || !countEl.textContent) {return}
            const count = ~~countEl.textContent
            const title = keyEl.getAttribute('title') || ''
            if (document.documentElement.lang === 'en') {
                tagsOfCategory.push({ ja: title, en: textContent, count })
            } else {
                tagsOfCategory.push({ ja: textContent, en: title, count })
            }
        })
        fileTags[tagCategory] = tagsOfCategory
    }
    return fileTags
}

function collectTags_konachan(): FileTags {
    const sidebarEl = document.querySelector('#tag-sidebar')
    const fileTags: FileTags = makeEmptyFileTags()
    if (!sidebarEl) {
        console.error('[To Developer] Not found tag')
        return fileTags
    }
    const meta: FileTagsElementClass = COMMON_SELECTOR.tagClass
    for (const tagCategory of ALL_TAG_CATEGORY) {
        const tagLiClass = meta[tagCategory]
        const tagsOfCategory: Tag[] = []
        let els = sidebarEl.querySelectorAll(tagLiClass)
        els.forEach((el) => {
            const key = el.getAttribute('data-name')
            if (!key) { return }
            const countEl = el.querySelector('.post-count')
            if (!countEl || !countEl.textContent) { return }
            const count = ~~countEl.textContent
            tagsOfCategory.push({ en: key, count })
        })
        fileTags[tagCategory] = tagsOfCategory
    }
    return fileTags
}

function collectTags_yandere(): FileTags {
    const sidebarEl = document.querySelector('#tag-sidebar')
    const fileTags: FileTags = makeEmptyFileTags()
    if (!sidebarEl) {
        console.error('[To Developer] Not found tag')
        return fileTags
    }
    const meta: FileTagsElementClass = COMMON_SELECTOR.tagClass
    for (const tagCategory of ALL_TAG_CATEGORY) {
        const tagLiClass = meta[tagCategory]
        const tagsOfCategory: Tag[] = []
        let els = sidebarEl.querySelectorAll(tagLiClass)
        els.forEach((el) => {
            const aList = el.querySelectorAll('a')
            if (aList.length < 2) { return }
            const key = aList[1].innerText.replace(/ /g, '_')  // replace space with underline
            if (!key) { return }
            const countEl = el.querySelector('.post-count')
            if (!countEl || !countEl.textContent) { return }
            const count = ~~countEl.textContent
            tagsOfCategory.push({ en: key, count })
        })
        fileTags[tagCategory] = tagsOfCategory
    }
    return fileTags
}

function collectTags_danbooru (): FileTags  {
    const sidebarEl = document.querySelector('#tag-list')
    const fileTags: FileTags = makeEmptyFileTags()
    if (!sidebarEl) {
        console.error('[To Developer] Not found tag')
        return fileTags
    }
    const meta: FileTagsElementClass = {
        artist: '.tag-type-1',
        character: '.tag-type-4',
        copyright: '.tag-type-3',
        general: '.tag-type-0',
        studio: '',
        meta: '.tag-type-5',
    }
    for (const tagCategory of ALL_TAG_CATEGORY) {
        const tagLiClass = meta[tagCategory]
        if (!tagLiClass) { continue }
        const tagsOfCategory: Tag[] = []
        let els = sidebarEl.querySelectorAll(tagLiClass)
        els.forEach((el) => {
            const count: number = parseInt(el.querySelector('.post-count')!.getAttribute('title')!)
            const enTag: string = el.querySelector('.search-tag')!.textContent!.trim()
            tagsOfCategory.push({ en: enTag, count })
        })
        fileTags[tagCategory] = tagsOfCategory
    }
    return fileTags
}
function collectTags_rule34xxx (): FileTags  {
    const sidebarEl = document.querySelector('#tag-sidebar')
    const fileTags: FileTags = makeEmptyFileTags()
    if (!sidebarEl) {
        console.error('[To Developer] Not found tag')
        return fileTags
    }
    const meta: FileTagsElementClass = COMMON_SELECTOR.tagClass
    for (const tagCategory of ALL_TAG_CATEGORY) {
        const tagLiClass = meta[tagCategory]
        if (!tagLiClass) { continue }
        const tagsOfCategory: Tag[] = []
        let els = sidebarEl.querySelectorAll(tagLiClass)
        els.forEach((el) => {
            const a = el.querySelector('a')
            if (!a || !a.textContent) {return}
            const enTag: string = a.textContent.trim()
            const span = el.querySelector('span')
            if (!span || !span.textContent) {return}
            const count: number = ~~span.textContent
            tagsOfCategory.push({ en: enTag, count })
        })
        fileTags[tagCategory] = tagsOfCategory
    }
    return fileTags
}
function collectTags_rule34paheal (): FileTags  {
    const sidebarEl = document.querySelector('#Tagsleft')
    const fileTags: FileTags = makeEmptyFileTags()
    if (!sidebarEl) {
        console.error('[To Developer] Not found tag')
        return fileTags
    }
    const meta: FileTagsElementClass = {
        artist: '',
        character: '',
        copyright: '',
        general: 'td a.tag_name',
        studio: '',
        meta: '',
    }
    for (const tagCategory of ALL_TAG_CATEGORY) {
        const tagLiClass = meta[tagCategory]
        if (!tagLiClass) { continue }
        const tagsOfCategory: Tag[] = []
        let els = sidebarEl.querySelectorAll(tagLiClass)
        els.forEach((a) => {
            const count: number = ~~a.parentElement!.nextElementSibling!.textContent!.trim()
            const enTag: string = a.textContent!
            tagsOfCategory.push({ en: enTag, count })
        })
        fileTags[tagCategory] = tagsOfCategory
    }
    return fileTags
}
function collectTags_rule34us (): FileTags  {
    const sidebarEl = document.querySelector('#tag-list\\ ')
    const fileTags: FileTags = makeEmptyFileTags()
    if (!sidebarEl) {
        console.error('[To Developer] Not found tag')
        return fileTags
    }
    const meta: FileTagsElementClass = {
        artist: '.artist-tag',
        character: '.character-tag',
        copyright: '.copyright-tag',
        general: '.general-tag',
        studio: '',
        meta: '',
    }
    for (const tagCategory of ALL_TAG_CATEGORY) {
        const tagLiClass = meta[tagCategory]
        if (!tagLiClass) { continue }
        const tagsOfCategory: Tag[] = []
        let els = sidebarEl.querySelectorAll(tagLiClass)
        els.forEach((el) => {
            const a = el.querySelector('a')
            if (!a) { return }
            const enTag: string = a.textContent!.trim()
            const small = el.querySelector('small')
            if (!small || !!small.textContent) { return }
            const count: number = ~~small.textContent!.trim()
            tagsOfCategory.push({ en: enTag, count })
        })
        fileTags[tagCategory] = tagsOfCategory
    }
    return fileTags
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
    const m = imgFileUrl.match(/\b[.](jpe?g|png|gif|bmp|webp|webm|mp4|mkv)\b/i)
    if (m) { return m[1] }
    return null
}

function generateFileName (imgFileUrl: string): string {
    const base = generateFileBaseName()
    const ext = guessExt(imgFileUrl)
    return `${base}.${ext}`
}
