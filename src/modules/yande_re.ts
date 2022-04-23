import { AbstractModule } from "./abstract"
import { ALL_TAG_CATEGORY, COMMON_TAG_SELECTOR, FileTags, FileTagsElementClass, generalCollectImageInfoList, makeEmptyFileTags, ParsedImageInfo, supported_hostname_t, Tag } from "../common"


export class ModuleYandeRe extends AbstractModule {
    constructor() {
        super()
    }
    hostname(): supported_hostname_t {
        return 'yande.re'
    }
    fullName (): string {
        return 'Yandere'
    }
    abbrev (): string {
        return 'YDR'
    }
    inPostListPage(): boolean {
        return !!location.pathname.match(/^[/]post[/]?$/)
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
        return `https://yande.re/post?tags=${fmtted}`
    }
    getPostLinkElementSelector(): string {
        return '#post-list-posts a.thumb'
    }
    getPostContentPagePendingElements(): Array<Element | null> {
        return [
            document.querySelector('#tag-sidebar'),
            document.querySelector('#highres'),
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
                const aList = el.querySelectorAll('a')
                if (aList.length < 2) { return }
                const key = aList[1].innerText.trim().replaceAll(' ', '_')  // replace space with underline
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
}
