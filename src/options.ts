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
interface SelectOptionData<T> {
    value: T,
    label: string,
    doc: string,
}

/** Rules are ordering-sensitive */
export const ALL_RULE_TYPE: SelectOptionData<rule_type_t>[] = [
    {value: 'CustomTagMatcher', label: "Custom",     doc: '<b>Custom tag matcher</b>. Custom your rule. When an image match the conditions you set, save it to a specific folder.'},
    {value: 'TagCategory',      label: "Auto",       doc: '<b>Auto choose tag category as folder name</b>. Notice, when an image has multiple tags in one category (for example, multiple "artist" tags), it will choose the shortest one. So the result may not be what you want.'},
    {value: 'Fallback',         label: "Fallback",   doc: '<b>Default rule</b>. When none of above rule matched, save to this folder. This is the default rule, which cannot be removed nor moved.'},
]
// type _infer_value_in_arr<T> = T extends {value: infer U}[] ? U : unknown
export type rule_type_t = 'CustomTagMatcher' | 'TagCategory' | 'Fallback'
export type logic_gate_t = 'AND' | 'OR'  // | 'CONTAINS_AND' | 'CONTAINS_OR'
export const ALL_LOGIC_GATE: SelectOptionData<logic_gate_t>[] = [
    {value: 'AND'   , label: "AND"   , doc: `The image must have matched by <b>all</b> tag patterns in this list.`}      ,
    {value: 'OR'    , label: "OR"    , doc: `The image matches <b>at least 1</b> tag pattern in this list.`} ,
    // {value: 'CONTAINS_AND', label: "CONTAINS+AND", doc: `<b>Partial string match + AND.</b> The image must have <b>all</b> tags in this list.`}    ,
    // {value: 'CONTAINS_OR' , label: "CONTAINS+OR" , doc: `<b>Partial string match + OR.</b> The image <b>at least one</b> tag in this list.`}       ,
]
export interface FolderClassifyRule__custom {
    ruleType: 'CustomTagMatcher',
    logicGate: logic_gate_t,
    ifContainsTag: string[],
    folderName: string,
}
export interface FolderClassifyRule__auto {
    ruleType: 'TagCategory'
    tagCategory: tag_category_t
    /** for example, if tagCategory is "artist", then the picture will be saved
     * into `DOWNLOAD_ROOT/FOLDER_NAME/ARTIST_NAME/` */
    folderName: `__AUTO__${tag_category_t}`
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
    {ruleType: 'CustomTagMatcher', logicGate: 'AND', ifContainsTag: ['hayasaka_ai', 'maid'], folderName: 'hayasaka_ai/maid' },
    {ruleType: 'CustomTagMatcher', logicGate: 'AND', ifContainsTag: ['hayasaka_ai'], folderName: 'hayasaka_ai' },
    {ruleType: 'CustomTagMatcher', logicGate: 'OR', ifContainsTag: ['shani', 'shani_(the_witcher)'], folderName: 'the_witcher/shani' },
    {ruleType: 'CustomTagMatcher', logicGate: 'OR', ifContainsTag: ['the_witcher*'], folderName: 'the_witcher' },
    {ruleType: 'TagCategory', tagCategory: 'artist', folderName: '__AUTO__artist' },
    {ruleType: 'TagCategory', tagCategory: 'character', folderName: '__AUTO__character' },
    {ruleType: 'TagCategory', tagCategory: 'copyright', folderName: '__AUTO__copyright' },
    {ruleType: 'Fallback', folderName: '__NO_CATEGORY__' },
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
    /** Design for touchscreen */
    paginationButtons: boolean,
    autoCloseTabAfterDownload: boolean
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
    overwriteExisted: boolean
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

export const MY_STORAGE_ROOT_DEFAULT: MyStorageRoot = {
    apiLevel: 2,
    options: {
        ui: {
            showNotificationWhenStartingToDownload: true,
            openLinkWithNewTab: false,
            buttonForCloseTab: false,
            paginationButtons: true,
            autoCloseTabAfterDownload: false,
        },
        fileName: {
            fileNameMaxCharacterLength: 180,
            fileNameTemplate: '[%siteabbrev%](%postid%)[%artist%][%series%][%character%]%generals%',
            tagSeparator: ',',
            overwriteExisted: false,
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
        return deepCopy(MY_STORAGE_ROOT_DEFAULT)
    }
    /** Set data object (can be deeply partial) into LocalStorage. */
    setRootSubsetPartially(subset: DeepPartial<MyStorageRoot>): Promise<void> {
        const newRoot = deepCopy(subset)
        return this.getRoot().then((existingRoot) => {
            deepMergeSubset(existingRoot, newRoot)
            console.log('[SET] STORAGE, subset (new) ===', newRoot)
            console.log('[SET] STORAGE, merged (ori) ===', existingRoot)
            this.area.set(existingRoot as any)
        })
    }
    setRoot(newRoot: MyStorageRoot) {
        this.area.set(newRoot as any)
    }
    setRootSafely(newRoot: MyStorageRoot) {
        return this.getRoot().then((existingRoot) => {
            deepObjectShaper(newRoot, existingRoot)
            this.area.set(newRoot as any)
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
                this.setRoot(root)
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

export const storageManager = (typeof browser !== 'undefined' ? new StorageManager() : null) as StorageManager
