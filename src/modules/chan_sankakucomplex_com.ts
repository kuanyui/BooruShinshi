import { AbstractModule, TaggedPostInPostsList } from "./abstract"
import { ALL_TAG_CATEGORY, COMMON_TAG_SELECTOR, FileTags, FileTagsElementClass, generalCollectImageInfoList, makeEmptyFileTags, PaginationInfo, ParsedImageInfo, supported_hostname_t, Tag } from "../common"


export class ModuleChanSankakuComplexCom extends AbstractModule {
    constructor() {
        super()
    }
    hostname(): supported_hostname_t {
        return 'chan.sankakucomplex.com'
    }
    fullName(): string {
        return 'SankakuComplex'
    }
    abbrev(): string {
        return 'SCX'
    }
    favicon(): string {
        return 'chan_sankakucomplex_com.png'
    }
    containsHentai(): boolean {
        return true
    }
    inPostListPage(): boolean {
        return !!location.pathname.match(/^[/][a-z-]+[/]posts?$/)

    }
    inPostContentPage(): boolean {
        return !!location.pathname.match(/^[/][a-z-]+[/]posts[/][A-Za-z0-9_-]+/)
    }
    getCurrentQueryList(): string[] {
        const params = new URLSearchParams(location.search)
        const raw = params.get('tags')
        if (raw) { return raw.split(' ') }
        return []
    }
    makeQueryUrl(queryList: string[]): string {
        const fmtted = queryList.filter(x => x).map(x=>x.trim()).join(' ')
        return `https://chan.sankakucomplex.com/post/index?tags=${fmtted}`
    }
    getLinkElementsToPost(): HTMLAnchorElement[] | NodeListOf<HTMLAnchorElement> {
        return document.querySelectorAll('span.thumb > a')
    }
    getTaggedPostsInPostsList(): TaggedPostInPostsList[] {
        const fin: TaggedPostInPostsList[] = []
        for (const wrapperEl of document.querySelectorAll<HTMLDivElement>('#post-list .thumb')) {
            const imgEl = wrapperEl.querySelector<HTMLImageElement>('img')
            if (!imgEl) { continue }
            const tagsStr = imgEl.title
            if (!tagsStr) { continue }
            fin.push({
                element: wrapperEl,
                tags: tagsStr.split(' ')
            })
        }
        return fin
    }
    ifPostContentPageIsReady(): boolean {
        return [
            document.querySelector('#image'),
            document.querySelector('#tag-sidebar'),
            document.querySelector('#stats'),
        ].every(x=>!!x)
    }
    ifPostLinkPageIsReady(): boolean {
        return [
            document.querySelector('#paginator')
        ].every(x=>!!x)
    }
    getPaginationInfo(): PaginationInfo {
        const links = Array.from(document.querySelectorAll('#paginator .pagination a'))
        const p = links.find(x=>x.textContent === "<<") as HTMLAnchorElement
        const n = links.find(x=>x.textContent === ">>") as HTMLAnchorElement
        return {
            prevPageUrl: p ? p.href : '',
            nextPageUrl: n ? n.href : ''
        }
    }
    getPostId(): number {
        const meta = document.querySelector(`meta[property="og:url"]`)
        if (!meta) { return -1 }
        const url = meta.getAttribute('content')
        if (!url) { return -1 }
        const m = url.match(/\/post\/show\/([0-9]+)/)
        return m ? ~~m[1] : -1
    }
    collectImageInfoList(): ParsedImageInfo[] {
        return generalCollectImageInfoList()
    }
    collectTags(): FileTags {
        const sidebarEl = document.querySelector('#tag-sidebar')
        const fileTags: FileTags = makeEmptyFileTags()
        if (!sidebarEl) {
            console.error('[DEBUG][To Developer] Not found tag')
            return fileTags
        }
        const meta: FileTagsElementClass = COMMON_TAG_SELECTOR
        for (const tagCategory of ALL_TAG_CATEGORY) {
            const tagLiClass = meta[tagCategory]
            const tagsOfCategory: Tag[] = []
            let els = sidebarEl.querySelectorAll(tagLiClass)
            console.warn(`[DEBUG] ${tagCategory} (${tagLiClass})`, els)
            els.forEach((el) => {
                const keyEl = el.querySelector<HTMLAnchorElement>('a[itemprop="keywords"]')
                if (!keyEl || !keyEl.textContent) { console.error('[BooruShinshi Error] No tag el'); return }
                const textContent = keyEl.textContent.trim().replace(/ /g, '_')  // replace space with underline
                const m = (keyEl.getAttribute('data-count') || '').match(/(\d+(?:\.\d+)?)([KMG])?/)
                if (!m) { console.error('[BooruShinshi Error] tooltip html not matched'); return }
                let count = parseFloat(m[1])
                const unit = m[2]
                switch (unit) {
                    case 'K': count *= 1000; break
                    case 'M': count *= 1000000; break
                    case 'G': count *= 1000000000; break
                }
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
    onBodyReady(): void {
        const a = document.querySelector<HTMLAnchorElement>('#sc-auto-toggle')!
        if (a.textContent!.includes('On')) {
            a.click()
        }
    }
}
