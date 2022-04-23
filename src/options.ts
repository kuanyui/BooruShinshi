import { tag_category_t } from "./common"

type TypedStorageChange<T> = {
    oldValue: T
    newValue: T
}
/** Strong typed version ChangeDict for WebExtension (e.g. browser.storage.onChanged).
 * T is the custom storage interface
 */
type TypedChangeDict<T> = { [K in keyof T]: TypedStorageChange<T[K]> }
enum __FilenameTemplateToken {
    'siteabbrev',
    'sitefullname',
    'postid',
    'artist',
    'copyright',
    'character',
    'generals'
}
type filename_template_token_t = keyof typeof __FilenameTemplateToken
export const ALL_FILENAME_TEMPLATE_TOKEN: filename_template_token_t[] = Object.keys(__FilenameTemplateToken).filter(x=>typeof x !== 'number') as any[]

export type filename_template_t = `${string}${filename_template_token_t}${string}`


/**
 *  - 是否以 `${網站名稱}` 作為根部資料夾名稱？ /${ROOT_DIR}/${SITE_NAME}/${FOLDER_CLASSIFY_RULE}/${FILE_NAME}
 *
 * - 根據 artist 名稱分資料假
 */
interface SelectOptionData {
    value: string,
    label: string,
    doc: string,
}

/** Rules are ordering-sensitive */
export const ALL_RULE_TYPE = [
    {value: 'CustomTagMatcher', label: "Custom",     doc: '<b>Custom tag matcher</b>. Custom your rule. When an image match the conditions you set, save it to a specific folder.'},
    {value: 'TagCategory',      label: "Auto",       doc: '<b>Auto choose tag category as folder name</b>. Notice, when an image has multiple tags in one category (for example, multiple "artist" tags), it will choose the shortest one. So the result may not be what you want.'},
    {value: 'Fallback',         label: "Fallback",   doc: '<b>Default rule</b>. When none of above rule matched, save to this folder. This is the default rule, which cannot be removed nor moved.'},
] as const
// type _infer_value_in_arr<T> = T extends {value: infer U}[] ? U : unknown
export type rule_type_t = 'CustomTagMatcher' | 'TagCategory' | 'Fallback'
export type logic_gate_t = 'AND' | 'OR'
export interface FolderClassifyRule__custom {
    ruleType: 'CustomTagMatcher',
    logicGate: logic_gate_t,
    ifContainsTag: string[],
    folderName: string,
}
export interface FolderClassifyRule__auto {
    ruleType: 'TagCategory'
    tagCategory: tag_category_t
}
/** This rules must be the last one and existed forever.
 * If none of the above rule matched, use fallback, and save to fallback folder.
 */
export interface FolderClassifyRule__fallback {
    ruleType: 'Fallback',
    folderName: string,
}
export type FolderClassifyRule =  FolderClassifyRule__custom | FolderClassifyRule__auto | FolderClassifyRule__fallback
export const DEFAULT_FOLDER_CLASSIFY_RULES: FolderClassifyRule[] = [
    {ruleType: 'TagCategory', tagCategory: 'copyright'},
    {ruleType: 'TagCategory', tagCategory: 'artist'},
    {ruleType: 'Fallback', folderName: '__NoCategory__' },
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

export type options_ui_input_id_t =
`ui_${keyof MyOptions_Ui}` |
`fileName_${keyof MyOptions_FileName}` |
`folder_${keyof MyOptions_Folder}`
export type options_ui_input_query_t = `#${options_ui_input_id_t}`

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
