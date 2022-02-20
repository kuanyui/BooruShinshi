export type supported_hostname_t =
    'chan.sankakucomplex.com' |
    'yande.re' |
    'konachan.com' |
    'konachan.net' |
    'danbooru.donmai.us' |
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

export type tag_category_t = 'copyright' | 'character' | 'artist' | 'studio' | 'general' | 'meta'
export const ALL_TAG_CATEGORY: tag_category_t[] = ['copyright', 'character', 'artist', 'studio', 'general', 'meta']
export type FileTags = Record<tag_category_t, Tag[]>
export type FileTagsElementClass = Record<tag_category_t, string>

export function objectKeys<T, K extends keyof T>(obj: T): K {
    return Object.keys(obj) as unknown as K
}

export const COMMON_SELECTOR = {
    tagClass: {
        copyright: '.tag-type-copyright',
        character: '.tag-type-character',
        artist: '.tag-type-artist',
        studio: '.tag-type-studio',
        general: '.tag-type-general',
        meta: '.tag-type-meta'
    }
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

export function isUrlSupported (url: string): boolean {
    const u = new URL(url + '')
    switch (u.hostname) {
        case 'chan.sankakucomplex.com':
        case 'yande.re':
        case 'konachan.com':
        case 'konachan.net':
            return u.pathname.includes('/post/show/')
        case 'danbooru.donmai.us': return !!u.pathname.match(/\/posts\/\d+/)
        case 'rule34.xxx': return u.searchParams.get('page') === 'post' && u.searchParams.get('s') === 'view'
        case 'rule34.paheal.net': return u.pathname.includes('/post/view/')
        case 'rule34.us': return u.searchParams.get('r') === 'posts/view'
    }
    return false
}
