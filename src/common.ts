export interface MyStorage {
    fileNameFormat: string
    fileNameMaxLength: number
    tagSeparator: string
}

export type my_msg_t = 'AskTabToDownload' | 'Success'

export interface MyMsg {
    type: my_msg_t
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
    static sendToTab (tabId: number, msg: MyMsg) {
        return browser.tabs.sendMessage(tabId, msg) as Promise<MyMsg | void>
    }
}

export function isUrlSupported (url: string) {
    const urlObj = new URL(url + '')
    return urlObj.hostname === 'chan.sankakucomplex.com'
}