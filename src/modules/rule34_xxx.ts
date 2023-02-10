import { AbstractModule } from "./abstract"
import { ALL_TAG_CATEGORY, COMMON_TAG_SELECTOR, FileTags, FileTagsElementClass, generalCollectImageInfoList, makeEmptyFileTags, PaginationInfo, ParsedImageInfo, supported_hostname_t, Tag } from "../common"


export class ModuleRule34XXX extends AbstractModule {
    constructor() {
        super()
    }
    hostname(): supported_hostname_t {
        return 'rule34.xxx'
    }
    fullName (): string {
        return 'Rule34.XXX'
    }
    abbrev (): string {
        return 'R3X'
    }
    containsHentai(): boolean {
        return true
    }
    inPostListPage(): boolean {
        const params = new URLSearchParams(location.search)
        return !!location.pathname.match(/^[/]index[.]php$/) &&
            params.get('page') === 'post' &&
            params.get('s') === 'list' &&
            params.get('tags') !== null
    }
    inPostContentPage(): boolean {
        const searchParams = new URLSearchParams(location.search)
        return searchParams.get('page') === 'post' && searchParams.get('s') === 'view'
    }
    getCurrentQueryList(): string[] {
        const params = new URLSearchParams(location.search)
        const raw = params.get('tags')
        if (raw) { return raw.split(' ') }
        return []
    }
    makeQueryUrl(queryList: string[]): string {
        const fmtted = queryList.filter(x => x).map(x=>x.trim()).join(' ')
        return `https://rule34.xxx/index.php?page=post&s=list&tags=${fmtted}`
    }
    getLinkElementsToPost(): HTMLAnchorElement[] | NodeListOf<HTMLAnchorElement> {
        return document.querySelectorAll('#post-list .content span.thumb a')
    }
    ifPostContentPageIsReady(): boolean {
        return [
            document.querySelector('#image') || document.querySelector('#gelcomVideoContainer'),
            document.querySelector('#tag-sidebar'),
        ].every(x=>!!x)
    }
    ifPostLinkPageIsReady(): boolean {
        return [
            document.querySelector('#paginator')
        ].every(x=>!!x)
    }
    getPaginationInfo(): PaginationInfo {
        const root = document.querySelector('#paginator')!
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
        for (const _a of Array.from(document.querySelectorAll('.link-list a'))) {
            const a = _a as HTMLLinkElement
            if (!a.textContent) { continue }
            if (a.textContent.includes('Original image')) {
                const size: string = Array.from(document.querySelector('#stats')!.querySelectorAll('li')).find(x=>x.textContent && x.textContent.includes('Size: '))!.textContent!
                fin.push({ btnText: `High (${size})`, imgUrl: a.href })
            }
        }
        return fin
    }
    collectTags(): FileTags {
        const sidebarEl = document.querySelector('#tag-sidebar')
        const fileTags: FileTags = makeEmptyFileTags()
        if (!sidebarEl) {
            console.error('[To Developer] Not found tag')
            return fileTags
        }
        const meta: FileTagsElementClass = COMMON_TAG_SELECTOR
        for (const tagCategory of ALL_TAG_CATEGORY) {
            const tagLiClass = meta[tagCategory]
            if (!tagLiClass) { continue }
            const tagsOfCategory: Tag[] = []
            let els = sidebarEl.querySelectorAll(tagLiClass)
            els.forEach((el) => {
                const a = el.querySelectorAll('a')[1]
                if (!a || !a.textContent) {return}
                const enTag: string = a.textContent.trim().replaceAll(' ', '_')
                const span = el.querySelector('.tag-count')
                if (!span || !span.textContent) {return}
                const count: number = ~~span.textContent
                tagsOfCategory.push({ en: enTag, count })
            })
            fileTags[tagCategory] = tagsOfCategory
        }
        return fileTags
    }
    onBodyReady(): void { }
}
