export type supported_hostname_t =
    'chan.sankakucomplex.com' |
    'yande.re' |
    'konachan.com' |
    'konachan.net' |
    'danbooru.donmai.us' |
    'gelbooru.com' |
    'safebooru.org' |
    'tbib.org' |
    'booru.allthefallen.moe' |
    'rule34.xxx' |
    'rule34.paheal.net' |
    'rule34.us'

export interface MyStorage {
    fileNameFormat: string
    fileNameMaxLength: number
    tagSeparator: string
}

export type my_msg_t = 'AskTabToDownload' | 'DownloadLinkGotten' | 'OpenLinkInNewTab' | 'CloseTab'
export type MyMsg = MyMsg_AskTabToDownload | MyMsg_DownloadLinkGotten | MyMsg_OpenLinkInNewTab | MyMsg_CloseCurrentTab

export interface MyMsg_BASE {
    type: my_msg_t,
}
export interface MyMsg_AskTabToDownload { type: 'AskTabToDownload' }
export interface MyMsg_CloseCurrentTab { type: 'CloseTab' }
export interface MyMsg_DownloadLinkGotten {
    type: 'DownloadLinkGotten'
    url: string
    filename: string
}
export interface MyMsg_OpenLinkInNewTab {
    type: 'OpenLinkInNewTab'
    url: string
}

export interface Tag {
    /** in English / Roman alphabets */
    en: string,
    /** in Japanese */
    ja?: string,
    /** post count */
    count: number
}

export interface ParsedImageInfo {
    /** Low, High, High PNG, Low (fallback) */
    btnText: string,
    /** ex: 1920x1080 */
    geometry?: string,
    /** ex: 600 KB */
    byteSize?: string,
    imgUrl: string
}

export function makeEmptyFileTags(): FileTags {
    return {
        copyright: [],
        artist: [],
        character: [],
        general: [],
        studio: [],
        meta: [],
    }
}

export type tag_category_t = 'copyright' | 'character' | 'artist' | 'studio' | 'general' | 'meta'
export const ALL_TAG_CATEGORY: tag_category_t[] = ['copyright', 'character', 'artist', 'studio', 'general', 'meta']
export type FileTags = Record<tag_category_t, Tag[]>
export type FileTagsElementClass = Record<tag_category_t, string>

export function objectKeys<T, K extends keyof T>(obj: T): K {
    return Object.keys(obj) as unknown as K
}

/** Used by SankakuComplex, Yande.re, Konachan. */
export const COMMON_TAG_SELECTOR: FileTagsElementClass = {
    copyright: '.tag-type-copyright',
    character: '.tag-type-character',
    artist: '.tag-type-artist',
    studio: '.tag-type-studio',
    general: '.tag-type-general',
    meta: '.tag-type-meta'
}

/** Used by SankakuComplex, Yande.re, Konachan. */
export function generalCollectImageInfoList(): ParsedImageInfo[] {
    const fin: ParsedImageInfo[] = []
    const lo = document.querySelector('#lowres') as HTMLLinkElement | null
    const hi = document.querySelector('#highres') as HTMLLinkElement | null
    const png = document.querySelector('#png') as HTMLLinkElement | null
    const imgEl = document.querySelector('#image') as HTMLImageElement | null
    if (lo) {
        fin.push({ btnText: 'Low', imgUrl: lo.href })
    }
    if (hi) {
        const rawSize = hi.innerText.match(/\((.+)\)/)
        let size: string = ''
        if (rawSize) { size = rawSize[1] }
        fin.push({ btnText: `High (${size})`, imgUrl: hi.href })
    }
    if (png) {
        const rawSize = png.innerText.match(/\((.+)\)/)
        let size: string = ''
        if (rawSize) { size = rawSize[1] }
        fin.push({ btnText: `High PNG (${size})`, imgUrl: png.href })
    }
    if ((!lo && !hi && !png) && imgEl) {
        fin.push({ btnText: 'Low (fallback)', imgUrl: imgEl.src })
    }
    return fin
}

export class storageManager {
    static setSync (d: Partial<MyStorage>): void {
        browser.storage.sync.set(d)
    }
    static getSync (): Promise<MyStorage | null> {
        return browser.storage.sync.get().then((d) => {
            return d as unknown as MyStorage
        }).catch((err) => {
            console.error('Error when getting settings from browser.storage.sync:', err)
            return null
        })
    }
}

export class msgManager {
    static sendToTab <T extends MyMsg> (tabId: number, msg: T) {
        return browser.tabs.sendMessage(tabId, msg) as Promise<T | void>
    }
    static sendToBg <T extends MyMsg> (msg: T) {
        return browser.runtime.sendMessage(msg)
    }
}

export interface QueryInfo {
    hostname: supported_hostname_t,
    queryKey: string,
    delimiter: string,
    queryUrl: string[],
}
