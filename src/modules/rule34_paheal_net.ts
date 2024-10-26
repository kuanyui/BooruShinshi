import { AbstractModule, TaggedPostInPostsList } from "./abstract"
import { ALL_TAG_CATEGORY, COMMON_TAG_SELECTOR, FileTags, FileTagsElementClass, generalCollectImageInfoList, makeEmptyFileTags, PaginationInfo, ParsedImageInfo, ParsedImageResolutionClass, supported_hostname_t, Tag } from "../common"


export class ModuleRule34PahealNet extends AbstractModule {
    constructor() {
        super()
    }
    hostname(): supported_hostname_t {
        return 'rule34.paheal.net'
    }
    fullName (): string {
        return 'Rule34 Paheal'
    }
    abbrev (): string {
        return 'R3P'
    }
    favicon(): string {
        return 'rule34_paheal_net.ico'
    }
    containsHentai(): boolean {
        return true
    }
    inPostListPage(): boolean {
        return !!location.pathname.match(/^[/]post[/]list[/][^/]+[/][0-9]+$/)
    }
    inPostContentPage(): boolean {
        return location.pathname.includes('/post/view/')
    }
    getCurrentQueryList(): string[] {
        const m = location.pathname.match(/[/]post[/]list[/]([^/]+?)[/]/)
        if (m) { return m[1].split(' ') }
        return []
    }
    makeQueryUrl(queryList: string[]): string {
        const fmtted = queryList.filter(x => x).map(x=>x.trim()).join(' ')
        return `http://rule34.paheal.net/post/list/${fmtted}/1`
    }
    getLinkElementsToPost(): HTMLAnchorElement[] | NodeListOf<HTMLAnchorElement> {
        const arr = document.querySelectorAll('a.shm-thumb-link') as NodeListOf<HTMLAnchorElement>
        arr.forEach((a) => a.onclick = null)  // TODO: Dirty hack. This code should not be written in here.
        return arr
    }
    getTaggedPostsInPostsList(): TaggedPostInPostsList[] {
        const fin: TaggedPostInPostsList[] = []
        for (const wrapperEl of document.querySelectorAll<HTMLDivElement>('#image-list .shm-thumb.thumb')) {
            const imgEl = wrapperEl.querySelector<HTMLImageElement>('img')
            if (!imgEl) { continue }
            const tagsStr = imgEl.title
            if (!tagsStr) { continue }
            fin.push({
                element: wrapperEl,
                tags: tagsStr.toLowerCase().split(' ').filter(x=>x)
            })
        }
        return fin
    }
    ifPostContentPageIsReady(): boolean {
        return [
            document.querySelector('#main_image'),
            document.querySelector('#Tagsleft'),
            document.querySelector('#ImageInfo'),
        ].every(x=>!!x)
    }
    ifPostLinkPageIsReady(): boolean {
        return [
            document.querySelector('#paginator')
        ].every(x=>!!x)
    }
    getPaginationInfo(): PaginationInfo {
        const root = document.querySelector('#paginator .blockbody')!
        const nodes = Array.from(root.childNodes)
        const p = nodes.find(x=>x.textContent === 'Prev')! as HTMLAnchorElement
        const n = nodes.find(x=>x.textContent === 'Next')! as HTMLAnchorElement
        return {
            prevPageUrl: p ? p.href : '',
            nextPageUrl: n ? n.href : ''
        }
    }
    getPostId(): number {
        const u = new URL(location.href)
        const m = u.pathname.match(/\/post\/view\/([0-9]+)/)
        return m ? ~~m[1] : -1
    }
    collectImageInfoList(): ParsedImageInfo[] {
        const fin: ParsedImageInfo[] = generalCollectImageInfoList()
        const mainImg = document.querySelector('#main_image') as HTMLImageElement
        fin.push({ btnText: `Low (fallback)`, imgUrl: mainImg.src, resClass: ParsedImageResolutionClass.LowRes })
        // const infoEl = document.querySelector('#ImageInfo')!
        // const tds = Array.from(infoEl.querySelectorAll('td'))
        // const sizeTd = tds.find(td => td.textContent!.match(/[KMG]B/))
        // const size: string = !sizeTd ? 'Unknown Size' : sizeTd.textContent!.match(/([0-9.]+[KMG]B)/)![1]
        // const imgLinkTd = tds.find(td => td.textContent!.match(/File Only/))
        // const imgLink = imgLinkTd!.querySelector('a')!
        // fin.push({ btnText: `High (${size})`, imgUrl: imgLink.href })
        return fin
    }
    collectTags(): FileTags {
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
                const enTag: string = a.textContent!.trim().replaceAll(' ', '_')
                tagsOfCategory.push({ en: enTag, count })
            })
            fileTags[tagCategory] = tagsOfCategory
        }
        return fileTags
    }
    onBodyReady(): void { }
}
