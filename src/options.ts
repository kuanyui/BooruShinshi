import { deepCopy, deepMergeSubset, deepObjectShaper, DeepPartial, tag_category_t } from "./common"

type TypedStorageChange<T> = {
    oldValue: T
    newValue: T
}
/** Strong typed version ChangeDict for WebExtension (e.g. browser.storage.onChanged).
 * T is the custom storage interface
 */
type TypedChangeDict<T> = { [K in keyof T]: TypedStorageChange<T[K]> }
export const FilenameTemplateTokenDict = {
    'siteabbrev': "Site's abbreviated name. For example, SankakuComplex is <code>SCX</code> ",
    'sitefullname': "Site's full name. For example, <code>SankakuComplex</code>",
    'postid': "Post's ID number it that site. For example: <code>123456</code>",
    'artist': `The tag "artist" or "studio". If not found, show <code>unknown_artist</code>. If found multiple, use artist first, or use the one with the most posts count.`,
    'series': `The canonical Booru tag is "copyright", that is "series" (ex: <code>k-on!</code>). If not found, show <code>no_series</code>. If found multiple, use the one with the most posts count.`,
    'character': `The tag "character". If not found, show <code>no_character</code>. If found multiple, use the one with the most posts count.`,
    'generals': `The tag "generals". This always pick multiple tags with <b>least</b> posts count, until the file name length limit reached.`,
}
export type filename_template_token_t = keyof typeof FilenameTemplateTokenDict
export const ALL_FILENAME_TEMPLATE_TOKEN: filename_template_token_t[] = Object.keys(FilenameTemplateTokenDict).filter(x=>typeof x !== 'number') as any[]



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
export interface MyStorageRoot {
    apiLevel: api_level_t,
    options: MyOptions,
    statistics: MyStatistics
}

export interface MyStatistics {
    downloadCount: number
}

export interface MyOptions {
    ui: MyOptions_Ui,
    fileName: MyOptions_FileName,
    folder: MyOptions_Folder,
}
export interface MyOptions_Ui {
    showNotificationWhenStartingToDownload: boolean,
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
        this.initAndGetRoot()
    }
    getDefaultRoot(): MyStorageRoot {
        return {
            apiLevel: 2,
            options: {
                ui: {
                    showNotificationWhenStartingToDownload: true,
                    openLinkWithNewTab: false,
                    buttonForCloseTab: false,
                },
                fileName: {
                    fileNameMaxCharacterLength: 180,
                    fileNameTemplate: '[%siteabbrev%](%postid%)[%artist%][%series%][%character%]%generals%',
                    tagSeparator: ','
                },
                folder: {
                    downloadFolderName: '__BooruShinshi__',
                    enableClassify: true,
                    classifyRules: DEFAULT_FOLDER_CLASSIFY_RULES,
                }
            },
            statistics: {
                downloadCount: 0,
            },
        }
    }
    /** Set data object (can be deeply partial) into LocalStorage. */
    setRootPartially(_newRoot: DeepPartial<MyStorageRoot>): Promise<void> {
        const newRoot = deepCopy(_newRoot)
        return this.getRoot().then((oriRoot) => {
            deepMergeSubset(oriRoot, newRoot)
            console.log('[SET] STORAGE, partial new ===', newRoot)
            console.log('[SET] STORAGE, merged root ===', oriRoot)
            this.area.set(oriRoot as any)
        })
    }
    /** Without NO migrations */
    initAndGetRoot(): Promise<MyStorageRoot> {
        return this.area.get().then((_ori) => {
            /** may be malformed */
            const DEFAULT_ROOT = this.getDefaultRoot()
            let modified: boolean
            let root = _ori as unknown as MyStorageRoot
            if (!root) {
                root = DEFAULT_ROOT
                modified = true
            } else {
                modified = deepObjectShaper(root, DEFAULT_ROOT)
            }
            console.log('[GET] browser.storage.sync.get() ORIGINAL', deepCopy(root))
            if (modified) {
                this.setRootPartially(root)
            }
            return root
        })
    }
    /** Get data object from LocalStorage */
    getRoot(): Promise<MyStorageRoot> {
        return this.area.get().then((root) => {
            return root as unknown as MyStorageRoot
        }).catch((err) => {
            console.error('Error when getting settings from browser.storage:', err)
            return this.initAndGetRoot()
        })
    }
    getData<K extends keyof MyStorageRoot>(category: K): Promise<MyStorageRoot[K]> {
        return this.getRoot().then((root) => {
            return root[category]
        })
    }
    onOptionsChanged(cb: (changes: TypedChangeDict<MyStorageRoot>) => void) {
        browser.storage.onChanged.addListener((_changes, areaName) => {
            const changes = _changes as TypedChangeDict<MyStorageRoot>
            if (areaName === 'sync' || areaName === 'local') {
                if (changes.options) {
                    cb(changes)
                }
            }
        })
    }

}

export const storageManager = new StorageManager()
