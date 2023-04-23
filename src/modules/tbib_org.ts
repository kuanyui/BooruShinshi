import { AbstractModule, TaggedPostInPostsList } from "./abstract"
import { ALL_TAG_CATEGORY, COMMON_TAG_SELECTOR, FileTags, FileTagsElementClass, generalCollectImageInfoList, makeEmptyFileTags, PaginationInfo, ParsedImageInfo, supported_hostname_t, Tag } from "../common"


export class ModuleTbibOrg extends AbstractModule {
    constructor() {
        super()
    }
    hostname(): supported_hostname_t {
        return 'tbib.org'
    }
    fullName (): string {
        return 'TBIB'
    }
    abbrev (): string {
        return 'TBI'
    }
    favicon(): string {
        return 'tbib_org.ico'
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
        return searchParams.get('page') === 'post' &&
               searchParams.get('s') === 'view' &&
               searchParams.get('id') !== null
    }
    getCurrentQueryList(): string[] {
        const params = new URLSearchParams(location.search)
        const raw = params.get('tags')
        if (raw) { return raw.split(' ') }
        return []
    }
    makeQueryUrl(queryList: string[]): string {
        const fmtted = queryList.filter(x => x).map(x=>x.trim()).join(' ')
        return `https://tbib.org/index.php?page=post&s=list&tags=${fmtted}`
    }
    getLinkElementsToPost(): HTMLAnchorElement[] | NodeListOf<HTMLAnchorElement> {
        return document.querySelectorAll('#post-list .content .thumb a')
    }
    getTaggedPostsInPostsList(): TaggedPostInPostsList[] {
        const fin: TaggedPostInPostsList[] = []
        for (const wrapperEl of document.querySelectorAll<HTMLDivElement>('#post-list .thumb')) {
            const imgEl = wrapperEl.querySelector<HTMLImageElement>('img.preview')
            if (!imgEl) { continue }
            const tagsStr = imgEl.title
            if (!tagsStr) { continue }
            fin.push({
                element: wrapperEl,
                tags: tagsStr.split(' ').filter(x=>x)
            })
        }
        return fin
    }
    ifPostContentPageIsReady(): boolean {
        return [
            document.querySelector('#image') || document.querySelector('#gelcomVideoPlayer'),
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
        const a = Array.from(document.querySelectorAll('#post-view .sidebar li a')).find(x => x.textContent!.includes('Original image')) as HTMLAnchorElement
        if (a) {
           const size: string = Array.from(document.querySelector('#stats')!.querySelectorAll('li')).find(x=>x.textContent && x.textContent.includes('Size: '))!.textContent!
           fin.push({ btnText: `High (${size})`, imgUrl: a.href })
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
        const meta: FileTagsElementClass = {
            artist: '.tag-type-artist',
            character: '.tag-type-character',
            copyright: '.tag-type-copyright',
            general: '.tag-type-general',
            studio: '',
            meta: '.tag-type-metadata',
        }
        for (const tagCategory of ALL_TAG_CATEGORY) {
            const tagLiClass = meta[tagCategory]
            if (!tagLiClass) { continue }
            const tagsOfCategory: Tag[] = []
            let els = sidebarEl.querySelectorAll(tagLiClass)
            els.forEach((el) => {
                const tagLink = el.querySelector('a')!
                const enTag = tagLink.textContent!.trim().replaceAll(' ', '_')
                const count: number = parseInt(tagLink.nextElementSibling!.textContent!.trim())
                tagsOfCategory.push({ en: enTag, count })
            })
            fileTags[tagCategory] = tagsOfCategory
        }
        return fileTags
    }
    onBodyReady(): void { }
}
