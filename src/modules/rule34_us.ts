import { AbstractModule, TaggedPostInPostsList } from "./abstract"
import { ALL_TAG_CATEGORY, COMMON_TAG_SELECTOR, FileTags, FileTagsElementClass, generalCollectImageInfoList, makeEmptyFileTags, PaginationInfo, ParsedImageInfo, ParsedImageResolutionClass, supported_hostname_t, Tag } from "../common"


export class ModuleRule34Us extends AbstractModule {
    constructor() {
        super()
    }
    hostname(): supported_hostname_t {
        return 'rule34.us'
    }
    fullName (): string {
        return 'Rule34 US'
    }
    abbrev (): string {
        return 'R3U'
    }
    favicon(): string {
        return 'rule34_us.png'
    }
    containsHentai(): boolean {
        return true
    }
    inPostListPage(): boolean {
        const params = new URLSearchParams(location.search)
        return !!location.pathname.match(/^[/]index[.]php$/) &&
            params.get('r') === 'posts/index' &&
            params.get('q') !== null
    }
    inPostContentPage(): boolean {
        const searchParams = new URLSearchParams(location.search)
        return searchParams.get('r') === 'posts/view'
    }
    getCurrentQueryList(): string[] {
        const params = new URLSearchParams(location.search)
        const raw = params.get('q')
        if (raw) { return raw.split(' ') }
        return []
    }
    makeQueryUrl(queryList: string[]): string {
        const fmtted = queryList.filter(x => x).map(x=>x.trim()).join(' ')
        return `http://rule34.us/index.php?r=posts/index&q=${fmtted}`
    }
    getLinkElementsToPost(): HTMLAnchorElement[] | NodeListOf<HTMLAnchorElement> {
        return document.querySelectorAll('.thumbail-container a')  // It really has a spelling mistake...
    }
    getTaggedPostsInPostsList(): TaggedPostInPostsList[] {
        const fin: TaggedPostInPostsList[] = []
        for (const wrapperEl of document.querySelectorAll<HTMLDivElement>('.thumbail-container > div')) {
            const imgEl = wrapperEl.querySelector<HTMLImageElement>('img')
            if (!imgEl) { continue }
            const tagsStr = imgEl.title
            if (!tagsStr) { continue }
            fin.push({
                element: wrapperEl,
                tags: tagsStr.split(', ').map(s => s.replaceAll(' ', '_'))
            })
        }
        return fin
    }
    ifPostContentPageIsReady(): boolean {
        return [
            document.querySelector('.content_push > img') || document.querySelector('.content_push > video'),
            document.querySelector('#tag-list\\ '),
            document.querySelector('#comment_form'),
        ].every(x=>!!x)
    }
    ifPostLinkPageIsReady(): boolean {
        return [
            document.querySelector('.pagination')
        ].every(x=>!!x)
    }
    getPaginationInfo(): PaginationInfo {
        const root = document.querySelector('.pagination')!
        const cur = root.querySelector('b')!
        const p = cur.previousElementSibling! as HTMLAnchorElement
        const n = cur.nextElementSibling! as HTMLAnchorElement
        return {
            prevPageUrl: p ? p.href : '',
            nextPageUrl: n ? n.href : ''
        }
    }
    getPostId(): number {
        const u = new URL(location.href)
        const id = u.searchParams.get('id')
        return id ? ~~id : -1
    }
    collectImageInfoList(): ParsedImageInfo[] {
        const fin: ParsedImageInfo[] = generalCollectImageInfoList()
        const videoEl = document.querySelector('.content_push > video') as HTMLVideoElement
        const imgEl = document.querySelector('.content_push > img') as HTMLImageElement
        if (videoEl) {
            for (const sourceEl of Array.from(videoEl.querySelectorAll('source'))) {
                const src = sourceEl.src
                let fmt = 'webm'
                if (src.includes('.webm')) { fmt = 'webm' }
                else if (src.includes('.mp4')) { fmt = 'mp4' }
                fin.push({ btnText: `High (.${fmt})`, imgUrl: src, resClass: ParsedImageResolutionClass.HighRes })
            }
        } else if (imgEl) {
            fin.push({ btnText: 'Low (fallback)', imgUrl: imgEl.src, resClass: ParsedImageResolutionClass.LowRes })
            document.querySelectorAll('#tag-list\\  > a').forEach((_a) => {
                const a = _a as HTMLAnchorElement
                if (!a.textContent) { return }
                if (a.textContent.trim() === 'Original') {
                    fin.push({ btnText: 'High (Original)', imgUrl: a.href, resClass: ParsedImageResolutionClass.HighRes })
                }
            })
        }
        return fin
    }
    collectTags(): FileTags {
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
            els.forEach((li) => {
                const a = li.querySelector('a')
                if (!a) { return }
                const enTag: string = a.textContent!.trim().replaceAll(' ', '_')
                const small = li.querySelector('small')
                if (!small || !small.textContent) { return }
                const count: number = ~~small.textContent!.trim()
                tagsOfCategory.push({ en: enTag, count })
            })
            fileTags[tagCategory] = tagsOfCategory
        }
        // console.log('[collectTags_rule34us] fileTags=====', fileTags)
        return fileTags
    }
    onBodyReady(): void { }
}
