import { AbstractModule } from "./abstract"
import { ALL_TAG_CATEGORY, COMMON_TAG_SELECTOR, FileTags, FileTagsElementClass, generalCollectImageInfoList, makeEmptyFileTags, ParsedImageInfo, supported_hostname_t, Tag } from "../common"


export class ModuleDanbooruDonmaiUs extends AbstractModule {
    constructor() {
        super()
    }
    hostname(): supported_hostname_t {
        return 'danbooru.donmai.us'
    }
    fullName (): string {
        return 'Danbooru'
    }
    abbrev (): string {
        return 'DBR'
    }
    inPostListPage(): boolean {
        return !!location.pathname.match(/^[/]posts[/]?$/)
    }
    inPostContentPage(): boolean {
        return !!location.pathname.match(/[/]posts[/]\d+/)
    }
    getCurrentQueryList(): string[] {
        const params = new URLSearchParams(location.search)
        const raw = params.get('tags')
        if (raw) { return raw.split(' ') }
        return []
    }
    makeQueryUrl(queryList: string[]): string {
        const fmtted = queryList.filter(x => x).map(x=>x.trim()).join(' ')
        return `https://danbooru.donmai.us/posts?tags=${fmtted}`
    }
    getPostLinkElementSelector(): string {
        return '.post-preview-link'
    }
    getPostContentPagePendingElements(): Array<Element | null> {
        return [
            document.querySelector('#image'),
            document.querySelector('#tag-list'),
            document.querySelector('#post-info-size'),
        ]
    }
    getPostId(): number {
        const u = new URL(location.href)
        const m = u.pathname.match(/\/posts\/([0-9]+)/)
        return m ? ~~m[1] : -1
    }
    collectImageInfoList(): ParsedImageInfo[] {
        const fin: ParsedImageInfo[] = generalCollectImageInfoList()
        const sizeEl = document.querySelector('#post-info-size')
        if (sizeEl) {
            const a = sizeEl.querySelector('a')!
            const size: string = a.textContent!
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
                const enTag: string = el.querySelector('.search-tag')!.textContent!.trim().replaceAll(' ', '_')
                tagsOfCategory.push({ en: enTag, count })
            })
            fileTags[tagCategory] = tagsOfCategory
        }
        return fileTags
    }
}
