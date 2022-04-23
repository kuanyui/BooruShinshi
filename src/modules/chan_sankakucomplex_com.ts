import { AbstractModule } from "./abstract"
import { ALL_TAG_CATEGORY, COMMON_TAG_SELECTOR, FileTags, FileTagsElementClass, generalCollectImageInfoList, makeEmptyFileTags, ParsedImageInfo, supported_hostname_t, Tag } from "../common"


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
        return 'SC'
    }
    inPostListPage(): boolean {
        return location.pathname === '/' ||
            !!location.pathname.match(/^[/]post[/]?$/) ||
            !!location.pathname.match(/^[/]post[/]index[/]?$/)

    }
    inPostContentPage(): boolean {
        return location.pathname.includes('/post/show/')
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
    getPostLinkElementSelector(): string {
        return 'span.thumb > a'
    }
    getPostContentPagePendingElements(): Array<Element | null> {
        return [
            document.querySelector('#image'),
            document.querySelector('#tag-sidebar'),
            document.querySelector('#stats'),
        ]
    }
    getPostId(): number {
        const u = new URL(location.href)
        const m = u.pathname.match(/\/post\/show\/([0-9]+)/)
        return m ? ~~m[1] : -1
    }
    collectImageInfoList(): ParsedImageInfo[] {
        return generalCollectImageInfoList()
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
            const tagsOfCategory: Tag[] = []
            let els = sidebarEl.querySelectorAll(tagLiClass)
            els.forEach((el) => {
                const keyEl = el.querySelector('a[itemprop="keywords"]')
                if (!keyEl || !keyEl.textContent) {return}
                const textContent = keyEl.textContent.trim().replace(/ /g, '_')  // replace space with underline
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
}
