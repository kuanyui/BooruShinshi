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
export type options_tag_category_t = tag_category_t | '__any__'
export const ALL_OPTIONS_TAG_CATEGORY: options_tag_category_t[] = ['__any__', ...ALL_TAG_CATEGORY]

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

/** forked from sanitize-filename because it sanitize slashes... */
export function sanitizeFilePath(fileName: string) {
    var illegalRe = /[\?<>\\:\*\|"]/g;
    var controlRe = /[\x00-\x1f\x80-\x9f]/g;
    var reservedRe = /^\.+$/;
    var windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
    return fileName
        .trim()
        .replace(illegalRe, '')
        .replace(controlRe, '')
        .replace(reservedRe, '')
        .replace(windowsReservedRe, '')
}

/**
 * @return true if modified the originalRoot. Else, false.
 */
export function deepObjectShaper<T, U>(originalRoot: T, wishedShape: U): boolean {
    let modified = false
    for (const k in originalRoot) {
        if (!Object.keys(wishedShape).includes(k)) {
            delete originalRoot[k]
            modified = true
        }
    }
    for (const k in wishedShape) {
        // @ts-ignore
        const ori = originalRoot[k]
        const wish = wishedShape[k]
        if (isObject(ori) && isObject(wish)) {
            modified = modified || deepObjectShaper(ori, wish)
        } else if (!Object.keys(originalRoot).includes(k)) {
            // @ts-expect-error
            originalRoot[k] = wishedShape[k]
            modified = true
        } else if (typeof ori !== typeof wish) {
            // @ts-expect-error
            originalRoot[k] = wishedShape[k]
            modified = true
        } else {
            // skip
        }
    }
    return modified
}

export function isObject<T extends object>(x: any): x is T {
    return typeof x === 'object' &&
        !Array.isArray(x) &&
        x !== null
}

export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>
} : T

export function deepMergeSubset<T>(originalRoot: T, subsetRoot: DeepPartial<T>): T {
    for (const k in subsetRoot) {
        if (isObject(subsetRoot[k])) {
            // @ts-ignore
            deepMergeSubset(originalRoot[k], subsetRoot[k])
        } else {
            // @ts-ignore
            originalRoot[k] = subsetRoot[k]
        }
    }
    return originalRoot
}

export function assertUnreachable (x: never) { x }
export function objectAssignPerfectly<T>(target: T, newValue: T) {
    return Object.assign(target, newValue)
}
export function deepCopy<T>(x: T): T {
    return JSON.parse(JSON.stringify(x))
}
