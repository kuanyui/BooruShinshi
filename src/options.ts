import { tag_category_t } from "./common"

type TypedStorageChange<T> = {
    oldValue: T
    newValue: T
}
/** Strong typed version ChangeDict for WebExtension (e.g. browser.storage.onChanged).
 * T is the custom storage interface
 */
type TypedChangeDict<T> = { [K in keyof T]: TypedStorageChange<T[K]> }
type __filename_fmt_template_token_t =
    'siteabbrev' |
    'sitefullname' |
    'postid' |
    'artist' |
    'copyright' |
    'character' |
    'general'
type filename_fmt_template_token_t = `%${__filename_fmt_template_token_t}%`

export type filename_template_t = `${string}${filename_fmt_template_token_t}${string}`


/**
 *  - 是否以 `${網站名稱}` 作為根部資料夾名稱？ /${ROOT_DIR}/${SITE_NAME}/${FOLDER_CLASSIFY_RULE}/${FILE_NAME}
 *
 * - 根據 artist 名稱分資料假
 */
/** Order sensitive */
export type folder_classify_rule_type_custom_t = 'CustomTag'
export type folder_classify_rule_type_auto_t = `AutoTag::${tag_category_t}`
/** If none of the above rule matched, use fallback, and save to fallback folder. */
export type folder_classify_rule_type_fallback_t = `Fallback`

export interface FolderClassifyRule__custom {
    ruleType: folder_classify_rule_type_custom_t,
    ifContainsTag: string[],
    folderName: string,
}
export interface FolderClassifyRule__auto {
    ruleType: folder_classify_rule_type_auto_t,
}
/** This rules must be the last one and existed forever. */
export interface FolderClassifyRule__fallback {
    ruleType: folder_classify_rule_type_fallback_t,
    folderName: string,
}
export type FolderClassifyRule =  FolderClassifyRule__custom | FolderClassifyRule__auto | FolderClassifyRule__fallback
export const DEFAULT_FOLDER_CLASSIFY_RULES: FolderClassifyRule[] = [
    {ruleType: 'AutoTag::copyright'},
    {ruleType: 'AutoTag::artist'},
    {ruleType: 'Fallback', folderName: '_NoCategory' },
]


type api_level_t = 1 | 2
export interface MyOptions {
    apiLevel: api_level_t,
    ui: MyOptions_Ui,
    fileName: MyOptions_FileName,
    folder: MyOptions_Folder,
}

export interface MyOptions_Ui {
    /** Design for touchscreen */
    openLinkWithNewTab: boolean,
    /** Design for touchscreen */
    buttonForCloseTab: boolean,
}
export interface MyOptions_FileName {
    /** include file ext.
     *
     * - `BTRFS`   255 bytes
     * - `exFAT`   255 UTF-16 characters
     * - `ext3`    255 bytes
     * - `ext4`    255 bytes
     * - `NTFS`    255 characters
     * - `XFS`     255 bytes
     **/
    fileNameMaxCharacterLength: number,
    fileNameTemplate: string
    tagSeparator: ',' | ' '
    // filenameTemplate: filename_template_t,
}
export interface MyOptions_Folder {
    /** Relative path in `~/Downloads` as the download root folder.
     * For example, `foo/bar` will create folder `~/Downloads/foo/bar/`.
     *
     * Empty means `~/Downloads` itself.
     **/
    downloadFolderName: string,
    /** If enabled, pictures will automatically be downloaded into different folders according to their tags. See classifyRules. */
    enableClassify: boolean,
    classifyRules: FolderClassifyRule[],
}

export function assertUnreachable (x: never) { x }
export function objectAssignPerfectly<T>(target: T, newValue: T) {
    return Object.assign(target, newValue)
}
export function deepCopy<T>(x: T): T {
    return JSON.parse(JSON.stringify(x))
}

class StorageManager {
    // tsconfig: useDefineForClassFields = false
    area: browser.storage.StorageArea
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
            apiLevel: 2,
            ui: {
                openLinkWithNewTab: false,
                buttonForCloseTab: false,
            },
            fileName: {
                fileNameMaxCharacterLength: 40,
                fileNameTemplate: '{postid}[{artist}][{series}][{character}]{general}',
                tagSeparator: ','
            },
            folder: {
                downloadFolderName: '_BooruShinshi',
                enableClassify: true,
                classifyRules: DEFAULT_FOLDER_CLASSIFY_RULES,
            }
        }
    }
    /** Set data object (can be partial) into LocalStorage. */
    setDataPartially(d: Partial<MyOptions>): void {
        const tmp = deepCopy(d)
        console.log('[SET] TO STORAGE', tmp)
        this.area.set(deepCopy(d) as any)
    }
    /** Get data object from LocalStorage */
    getData(): Promise<MyOptions> {
        return this.area.get().then((_ori) => {
            let needSave = false
            /** may be malformed */
            const ori = _ori as unknown as MyOptions
            console.log('[GET] ORIGINAL', deepCopy(ori))
            const DEFAULT = this.getDefaultData()
            if (!ori || ori.apiLevel !== 2) {
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
            // migrateLoop:
            // while (final.apiLevel !== DEFAULT.apiLevel) {
            //     switch (final.apiLevel) {
            //         case undefined: {
            //             continue migrateLoop
            //         }
            //         case 1: {
            //             // Latest
            //             break
            //         }
            //         default: {
            //             assertUnreachable(final.apiLevel)
            //         }
            //     }
            // }
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
