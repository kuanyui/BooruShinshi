import { AbstractModule } from "./abstract"
import { ALL_TAG_CATEGORY, COMMON_TAG_SELECTOR, FileTags, FileTagsElementClass, generalCollectImageInfoList, makeEmptyFileTags, ParsedImageInfo, supported_hostname_t, Tag } from "../common"


export class ModuleGelbooruCom extends AbstractModule {
    constructor() {
        super()
    }
    hostname(): supported_hostname_t {
        return 'gelbooru.com'
    }
    fullName (): string {
        return 'Gelbooru'
    }
    abbrev (): string {
        return 'GBR'
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
        return searchParams.get('page') === 'post'
    }
    getCurrentQueryList(): string[] {
        const params = new URLSearchParams(location.search)
        const raw = params.get('tags')
        if (raw) { return raw.split(' ') }
        return []
    }
    makeQueryUrl(queryList: string[]): string {
        const fmtted = queryList.filter(x => x).map(x=>x.trim()).join(' ')
        return `https://gelbooru.com/index.php?page=post&s=list&tags=${fmtted}`
    }
    getPostLinkElementSelector(): string {
        return '.thumbnail-container a'
    }
    getPostContentPagePendingElements(): Array<Element | null> {
        return [
            document.querySelector('#image') || document.querySelector('#gelcomVideoPlayer'),
            document.querySelector('#tag-list'),
        ]
    }
    getPostId(): number {
        const u = new URL(location.href)
        const id = u.searchParams.get('id')
        return id ? ~~id : -1
    }
    collectImageInfoList(): ParsedImageInfo[] {
        const fin: ParsedImageInfo[] = generalCollectImageInfoList()
        const a = Array.from(document.querySelectorAll('#tag-list li a')).find(x => x.textContent!.includes('Original image')) as HTMLAnchorElement
        if (a) {
           const size: string = Array.from(document.querySelector('#tag-list')!.querySelectorAll('li')).find(x=>x.textContent && x.textContent.includes('Size: '))!.textContent!
           fin.push({ btnText: `High (${size})`, imgUrl: a.href })
        }
        return fin
    }
    collectTags(): FileTags {
        const sidebarEl = document.querySelector('#tag-list')
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
                const tagLink = el.querySelectorAll('a')[1]
                const enTag = tagLink.textContent!.trim()
                const count: number = parseInt(tagLink.nextElementSibling!.textContent!.trim())
                tagsOfCategory.push({ en: enTag, count })
            })
            fileTags[tagCategory] = tagsOfCategory
        }
        return fileTags
    }
}
