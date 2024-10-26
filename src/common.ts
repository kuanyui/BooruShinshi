export type supported_hostname_t =
    'chan.sankakucomplex.com' |
    'yande.re' |
    'konachan.com' |
    'konachan.net' |
    'betabooru.donmai.us' |
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
    /** URL of image file */
    url: string
    filename: string
    /** `Referer` in HTTP header */
    referer: string
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

export enum ParsedImageResolutionClass {
    LowRes,
    HighRes,
}

export interface ParsedImageInfo {
    /** Low, High, High PNG, Low (fallback) */
    btnText: string,
    /** ex: 1920x1080 */
    geometry?: string,
    /** ex: 600 KB */
    byteSize?: string,
    imgUrl: string,
    /** Resolution class. Some site requires extra handling / workaround to download a hi-res image. */
    resClass: ParsedImageResolutionClass
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
export interface PaginationInfo {
    /** Empty string means currently is the first page. */
    prevPageUrl: string
    /** Empty string means no next page anymore. */
    nextPageUrl: string
}

export type tag_category_t = 'copyright' | 'character' | 'artist' | 'studio' | 'general' | 'meta'
/** Order sensitive */
export const ALL_TAG_CATEGORY: tag_category_t[] = ['artist', 'copyright', 'studio', 'character', 'general', 'meta']
export type options_tag_category_t = tag_category_t
export const ALL_OPTIONS_TAG_CATEGORY: options_tag_category_t[] =  ALL_TAG_CATEGORY
export function isTagCategory(x: string): x is tag_category_t {
    return ALL_TAG_CATEGORY.includes(x as tag_category_t)
}
export type FileTags = Record<tag_category_t, Tag[]>
export type FileTagsElementClass = Record<tag_category_t, string>

export function objectKeys<T extends object>(obj: T): Array<keyof T> {
    return Object.keys(obj) as Array<keyof T>
}

/** Used by SankakuComplex, Yande.re, Konachan. */
export const COMMON_TAG_SELECTOR: FileTagsElementClass = {
    artist: '.tag-type-artist',
    copyright: '.tag-type-copyright',
    character: '.tag-type-character',
    studio: '.tag-type-studio',
    general: '.tag-type-general',
    meta: '.tag-type-meta'
} as const

/** Used by SankakuComplex, Yande.re, Konachan. */
export function generalCollectImageInfoList(): ParsedImageInfo[] {
    const fin: ParsedImageInfo[] = []
    const lo = document.querySelector('#lowres') as HTMLLinkElement | null
    const hi = document.querySelector('#highres') as HTMLLinkElement | null
    const png = document.querySelector('#png') as HTMLLinkElement | null
    const imgEl = document.querySelector('#image') as HTMLImageElement | null
    if (lo) {
        fin.push({ btnText: 'Low', imgUrl: lo.href, resClass: ParsedImageResolutionClass.LowRes })
    }
    if (hi) {
        const rawSize = hi.innerText.match(/\((.+)\)/)
        let size: string = ''
        if (rawSize) { size = rawSize[1] }
        fin.push({ btnText: `High (${size})`, imgUrl: hi.href, resClass: ParsedImageResolutionClass.HighRes })
    }
    if (png) {
        const rawSize = png.innerText.match(/\((.+)\)/)
        let size: string = ''
        if (rawSize) { size = rawSize[1] }
        fin.push({ btnText: `High PNG (${size})`, imgUrl: png.href, resClass: ParsedImageResolutionClass.HighRes })
    }
    if ((!lo && !hi && !png) && imgEl) {
        fin.push({ btnText: 'Low (fallback)', imgUrl: imgEl.src, resClass: ParsedImageResolutionClass.LowRes })
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

export function isObject<T extends object>(x: any): x is T {
    return typeof x === 'object' &&
        !Array.isArray(x) &&
        x !== null
}

export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>
} : T

/**
 * A little like Object.assign(), but
 * - originalRoot will be tried to transform info the type of "wishedShaped".
 *   - Type of originalRoot will ALWAYS become same as wishedShape.
 * @param originalRoot: A reference which may be modified -- "shaped" into "wishedShape"
 * @param wishedShape: originalRoot will be tried to transform info the type of "wishedShaped".
 * @return true if modified the originalRoot. Else, false.
 */
export function deepObjectShaper<T extends object, U extends object>(originalRoot: T, wishedShape: U): boolean {
    let modified = false
    for (const k in originalRoot) {
        if (!originalRoot.hasOwnProperty(k)) { continue }
        if (!wishedShape.hasOwnProperty(k)) {
            delete originalRoot[k]
            modified = true
        }
    }
    for (const k in wishedShape) {
        if (!wishedShape.hasOwnProperty(k)) { continue }
        // @ts-ignore
        const ori = originalRoot[k]
        const wish = wishedShape[k]
        if (isObject(ori) && isObject(wish)) {
            // NOTE: Debugged for over 3 hours to find out that don't place `modified` before `||`
            // NOTE: How did I find out this? => print out all `k` in `for (k in O)` loop, and found that new key under `options` are not printed out at all.
            // That is to say, when `modified` is true, then the function in `modified || deepObjectShaper(ori, wish)` will never be executed...
            // But currently I don't know how to write a test to figure this shit out.
            modified = deepObjectShaper(ori, wish) || modified
        } else if (!originalRoot.hasOwnProperty(k)) {
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


/**
 * Deep version of Object.assign(target, other), BUT:
 * - The type of target will NEVER be changed.
 * - Return void.
 *
 * @param originalRoot
 * @param subsetRoot
 * @returns
 */
export function deepMergeSubset<T>(originalRoot: T, subsetRoot: DeepPartial<T>): void {
    if (!originalRoot) { return }
    for (const k in subsetRoot) {
        if (isObject(subsetRoot[k])) {
            // @ts-ignore
            deepMergeSubset(originalRoot[k], subsetRoot[k])
        } else {
            // @ts-ignore
            originalRoot[k] = subsetRoot[k]
        }
    }
    return
}

export function assertUnreachable (x: never) { x }
export function objectAssignPerfectly<T>(target: T, newValue: T) {
    // @ts-ignore
    return Object.assign(target, newValue)
}
export function deepCopy<T>(x: T): T {
    return JSON.parse(JSON.stringify(x))
}

export function toHtmlEntities (unsafeHtml: string) {
    return unsafeHtml.replace(/./gm, function(s) {
        return (s.match(/[a-z0-9\s]+/i)) ? s : "&#" + s.charCodeAt(0) + ";"
    });
}
export function fromHtmlEntities (htmlStringContainingEntities: string) {
    return (htmlStringContainingEntities + "").replace(/&#\d+;/gm, (s) => {
        const m = s.match(/\d+/gm)!
        const code: number = ~~m[0]
        return String.fromCharCode(code)
    })
}

export function createDebounceFunction (callback: () => any, durMs: number): () => any {
    let timeoutId: number
    return () => {
        clearTimeout(timeoutId)
        timeoutId = window.setTimeout(() => {
            callback()
            timeoutId = -1
        }, durMs)
    }
}


interface ElAttr {
    id?: string,
    className?: string,
    textContent?: string,
    href?: string,
    disabled?: boolean
}
export function createEl<K extends keyof HTMLElementTagNameMap>(tagName: K, attrs: ElAttr): HTMLElementTagNameMap[K] {
    const el = document.createElement(tagName)
    if (attrs.id) { el.id = attrs.id }
    if (attrs.className) { el.className = attrs.className }
    if (attrs.textContent) { el.textContent = attrs.textContent }
    if (attrs.href && el instanceof HTMLAnchorElement) { el.href = attrs.href }
    // @ts-expect-error
    if (attrs.disabled && attrs.disabled !== 'false') { el.setAttribute('disabled', attrs.disabled) }
    return el
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        window.setTimeout(resolve, ms)
    })
}