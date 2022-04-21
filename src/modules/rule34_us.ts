import { AbstractModule } from "./abstract"
import { ALL_TAG_CATEGORY, COMMON_TAG_SELECTOR, FileTags, FileTagsElementClass, generalCollectImageInfoList, makeEmptyFileTags, ParsedImageInfo, supported_hostname_t, Tag } from "../common"


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
    getPostLinkElementSelector(): string {
        return '.thumbail-container a'  // It really has a spelling mistake...
    }
    getPostContentPagePendingElements(): Array<Element | null> {
        return [
            document.querySelector('.content_push > img') || document.querySelector('.content_push > video'),
            document.querySelector('#tag-list\\ '),
            document.querySelector('#comment_form'),
        ]
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
                fin.push({ btnText: `High (.${fmt})`, imgUrl: src })
            }
        } else if (imgEl) {
            fin.push({ btnText: 'Low (fallback)', imgUrl: imgEl.src })
            document.querySelectorAll('#tag-list\\  > a').forEach((_a) => {
                const a = _a as HTMLAnchorElement
                if (!a.textContent) { return }
                if (a.textContent.trim() === 'Original') {
                    fin.push({ btnText: 'High (Original)', imgUrl: a.href })
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
                const enTag: string = a.textContent!.trim()
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
}
