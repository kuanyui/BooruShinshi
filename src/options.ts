type TypedStorageChange<T> = {
    oldValue: T
    newValue: T
}
/** Strong typed version ChangeDict for WebExtension (e.g. browser.storage.onChanged).
 * T is the custom storage interface
 */
type TypedChangeDict<T> = { [K in keyof T]: TypedStorageChange<T[K]> }
type filename_fmt_template_token_t =
    '%siteabbr%' |
    '%sitefullname%' |
    '%imageid%' |
    '%author%' |
    '%series%' |
    '%character%'

export type filename_template_t =
    `${string}${filename_fmt_template_token_t}${string}`

type api_level_t = 1
export interface MyOptions {
    apiLevel: api_level_t,
    /** Design for touchscreen */
    openLinkWithNewTab: boolean,
    /** Design for touchscreen */
    buttonForCloseTab: boolean,
    /** not include file ext */
    fileNameMaxLength: number,
    // fileNameFormat: '({author})[{series}][{character}]{tags}',  // site, postid
    // tagSeparator: ','
    // filenameTemplate: filename_template_t,
}

function assertUnreachable (x: never) { x }
export function objectAssignPerfectly<T>(target: T, newValue: T) {
    return Object.assign(target, newValue)
}
export function deepCopy<T>(x: T): T {
    return JSON.parse(JSON.stringify(x))
}

class StorageManager {
    area: browser.storage.StorageArea   // tsconfig: useDefineForClassFields = false
    constructor() {
        // Firefox for Android (90) doesn't support `sync` area yet,
        // so write a fallback for it.
        if (browser.storage.sync) {
            this.area = browser.storage.sync
        } else {
            this.area = browser.storage.local
        }
    }
    getDefaultData(): MyOptions {
        return {
            apiLevel: 1,
            openLinkWithNewTab: false,
            buttonForCloseTab: false,
            fileNameMaxLength: 40,
        }
    }
    /** Set data object (can be partial) into LocalStorage. */
    setDataPartially(d: Partial<MyOptions>): void {
        console.log('[SET] TO STORAGE', deepCopy(d))
        this.area.set(deepCopy(d))
    }
    /** Get data object from LocalStorage */
    getData(): Promise<MyOptions> {
        return this.area.get().then((_ori) => {
            let needSave = false
            /** may be malformed */
            const ori = _ori as unknown as MyOptions
            console.log('[GET] ORIGINAL', deepCopy(ori))
            const DEFAULT = this.getDefaultData()
            if (!ori) {
                this.setDataPartially(DEFAULT)
                return DEFAULT
            }
            const final = this.getDefaultData()
            // Removed deprecated fields
            for (const _expectedKey in final) {
                const expectedKey = _expectedKey as keyof MyOptions
                if (ori[expectedKey] !== undefined) {  // expectedKey found in gotten object
                    // @ts-ignore
                    final[expectedKey] = ori[expectedKey]
                } else {
                    needSave = true
                }
            }
            // ==================================
            // MIGRATION BEGINS
            // ==================================
            migrateLoop:
            while (final.apiLevel !== DEFAULT.apiLevel) {
                switch (final.apiLevel) {
                    case undefined: {
                        continue migrateLoop
                    }
                    case 1: {
                        // Latest
                        break
                    }
                    default: {
                        assertUnreachable(final.apiLevel)
                    }
                }
            }
            // ==================================
            // MIGRATION ENDS
            // ==================================
            console.log('[GET] FIXED', final)
            if (needSave) {
                this.setDataPartially(final)
            }
            return final
        }).catch((err) => {
            console.error('Error when getting settings from browser.storage:', err)
            return this.getDefaultData()
        })
    }
    onDataChanged(cb: (changes: TypedChangeDict<MyOptions>) => void) {
        browser.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'sync' || areaName === 'local') {
                cb(changes as TypedChangeDict<MyOptions>)
            }
        })
    }
}

export const storageManager = new StorageManager()
