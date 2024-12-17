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
    'artists': `The full list of "artist"s. If not found, show <code>unkown_artists</code>.`,
    'studios': `The full list of "studio"s. If not found, show <code>no_studios</code>.`,
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


type api_level_t = 1 | 2 | 3

const SYNC_STORAGE_ENTRIES_DEFAULT = {
    apiLevel: 3 as api_level_t,
    statistics_downloadCount: 0 as number
} as const

type sync_entry_key_t = keyof typeof SYNC_STORAGE_ENTRIES_DEFAULT
type GetSyncEntryValueType<K extends sync_entry_key_t> = (typeof SYNC_STORAGE_ENTRIES_DEFAULT)[K]

export interface MyLocalStorageRoot {
    apiLevel: api_level_t,
    options: MyLocalOptions,
}


export interface MyLocalOptions {
    ui: MyLocalOptions_Ui,
    ux: MyLocalOptions_Ux,
    fileName: MyLocalOptions_FileName,
    folder: MyLocalOptions_Folder,
}
export interface MyLocalOptions_Ui {
    showNotificationWhenStartingToDownload: boolean,
    /** Design for touchscreen */
    openLinkWithNewTab: boolean,
    /** Design for touchscreen */
    buttonForCloseTab: boolean,
    /** Design for touchscreen */
    paginationButtons: boolean,
    autoCloseTabAfterDownload: boolean
}
export interface MyLocalOptions_Ux {
    /** If image contains "ai_generated", the image will be hidden.
    */
    excludeAiGenerated: boolean
    /** A block list can be applied across all booru sites. Separates each tag by space or newline. */
    blockedTags: string
}
export interface MyLocalOptions_FileName {
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
    /**
     * If you want some preferred tags are contained in the filename as possible as it can, please specify at here.
     * Separates each tag by space or newline.
     *
     * Notice:
     * 1. This is mainly designed for searching file locally.
     * 2. **This effects image file name itself only, instead of the folder where the image file will be saved.**
     * 3. File name has length limit, so the tags will be matched by order, until file name limit reached.
     * 4. This effects filename, so changing this may cause the same file be saved with different filenames.
     * 5. If an image contains multiple characters, you can also specify the preferred one here (because a file name can include the name of only one character).
     */
    preferredTags: string
}
export interface MyLocalOptions_Folder {
    /** Relative path in `~/Downloads` as the download root folder.
     * For example, `foo/bar` will create folder `~/Downloads/foo/bar/`.
     *
     * Empty means `~/Downloads` itself.
     **/
    downloadFolderName: string,
    /** If enabled, pictures will automatically be downloaded into different folders according to their tags. See classifyRules. */
    enableClassify: boolean,
    /** **This effects the folder path where the files are saved, but does NO effect the image file name itself.** */
    classifyRules: FolderClassifyRule[],
}

export type options_ui_input_id_t =
`ui_${keyof MyLocalOptions_Ui}` |
`ux_${keyof MyLocalOptions_Ux}` |
`fileName_${keyof MyLocalOptions_FileName}` |
`folder_${keyof MyLocalOptions_Folder}`
export type options_ui_input_query_t = `#${options_ui_input_id_t}`

export const MY_LOCAL_STORAGE_ROOT_DEFAULT: MyLocalStorageRoot = {
    apiLevel: 3,
    options: {
        ui: {
            showNotificationWhenStartingToDownload: true,
            openLinkWithNewTab: false,
            buttonForCloseTab: false,
            paginationButtons: true,
            autoCloseTabAfterDownload: false,
        },
        ux: {
            excludeAiGenerated: false,
            blockedTags: ["furry fur anthro purple_skin orange_skin pink_skin green_skin blue_skin",
                "purple_body orange_body pink_body green_body blue_body",
                "bestiality insect giant_insect zoophilia",
                "tentacle* creature_inside monster monster_girl octopus_trap",
                "guro murder corpse beheaded necrophilia headless",
                "real_life"
            ].join('\n'),
        },
        fileName: {
            fileNameMaxCharacterLength: 180,
            fileNameTemplate: '[%siteabbrev%](%postid%)[%artist%][%series%][%character%]%generals%',
            tagSeparator: ',',
            overwriteExisted: false,
            preferredTags: '',
        },
        folder: {
            downloadFolderName: '__BooruShinshi__',
            enableClassify: true,
            classifyRules: DEFAULT_FOLDER_CLASSIFY_RULES,
        }
    },
} as const


class StorageManager {
    // tsconfig: useDefineForClassFields = false
    localArea: browser.storage.StorageArea
    syncArea: browser.storage.StorageArea
    constructor() {
        this.localArea = browser.storage.local
        this.syncArea = browser.storage.sync
        this.initAndGetRoot()  // FIXME: redundant calling?
    }
    /**
     * [Update 20240827] storage.sync has size quota, so migrate to storage.local.
     * See:
     * - https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/sync
     * - https://github.com/kuanyui/BooruShinshi/issues/8
     */
    private async migrateSyncToLocal(): Promise<boolean> {
        try {
            const syncData = await browser.storage.sync.get()
            const localData = await browser.storage.local.get()
            console.warn('[migrateSyncToLocal] syncData.options ===', (syncData || {}).options)
            console.warn('[migrateSyncToLocal] localData.options ===', (localData || {}).options)
            if (Object.keys(syncData).length > 0 && Object.keys(localData).length === 0) {
                console.log('[migrateSyncToLocal] Migrating browser.storage.sync to browser.storage.local...')
                await browser.storage.local.set(syncData)
                this.setSync('apiLevel', 3)
                // @ts-expect-error
                if (syncData && syncData.statictics && typeof syncData.statictics.downloadCount === 'number') {
                    // @ts-expect-error
                    this.setSync('statistics_downloadCount', syncData.statictics.downloadCount)
                }
                // await browser.storage.sync.clear  // For safety, do not clear sync data.
                console.log('migrate browser.storage.sync -> browser.storage.local done.')
            }
            return true
        } catch (err) {
            console.error('migrate browser.storage.sync -> browser.storage.local failed.')
            return false
        }
    }
    public getSyncAll(): Promise<typeof SYNC_STORAGE_ENTRIES_DEFAULT> {
        return this.syncArea.get().then((allObj) => {
            return allObj !== undefined ? allObj : SYNC_STORAGE_ENTRIES_DEFAULT as any
        })
    }
    public getSync<K extends sync_entry_key_t>(key: K): Promise<GetSyncEntryValueType<K>> {
        return this.syncArea.get(key).then((allObj) => {
            return allObj[key] !== undefined ? allObj[key] : SYNC_STORAGE_ENTRIES_DEFAULT[key] as any
        })
    }
    public setSync<K extends sync_entry_key_t>(key: K, val: GetSyncEntryValueType<K>): Promise<void> {
        return this.syncArea.set({ [key]: val })
    }
    /**
     * - Call this and wait promise resolve at first time you initialize this
     *   WebExtension. This function will initialize & migrate the data
     *   structure of StorageArea (for user settings).
     * - If already initialized, use `getRoot()` instead.
     **/
    public async initAndGetRoot(): Promise<MyLocalStorageRoot> {
        await this.migrateSyncToLocal()
        const copiedDefaultRoot = this.getDefaultRoot()
        return this.localArea.get().then((oriRoot) => {
            let copiedOriRoot = deepCopy(oriRoot as unknown as MyLocalStorageRoot)
            console.log('[initAndGetRoot] browser.storage.sync.get() ORIGINAL', deepCopy(copiedOriRoot))
            let modified: boolean
            // console.log('[initAndGetRoot] [BEFORE MIGRATION] DIFF =>', deepDiff(copiedOriRoot, copiedDefaultRoot))
            if (!copiedOriRoot) {
                console.log('[initAndGetRoot] No existed settings found, initialize a new one.')
                copiedOriRoot = copiedDefaultRoot
                modified = true

            } else {
                modified = deepObjectShaper(copiedOriRoot, copiedDefaultRoot)
                console.log("[initAndGetRoot] Shaper=>", oriRoot, copiedDefaultRoot)
            }
            // console.log('[initAndGetRoot] [AFTER MIGRATION] DIFF =>', deepDiff(copiedOriRoot, copiedDefaultRoot))
            if (modified) {
                console.log('[initAndGetRoot] browser.storage is migrated; migration result ===', copiedOriRoot)
                return this.removeDeprecatedRootKeys(copiedOriRoot).then(() => {
                    return this.setRootArbitrary(copiedOriRoot).then(() => {   // Wait for finished
                        return copiedOriRoot
                    })
                })
            } else {
                console.log('[initAndGetRoot] Not modified.')
                return copiedOriRoot
            }
        })
    }
    public getDefaultRoot(): MyLocalStorageRoot {
        return deepCopy(MY_LOCAL_STORAGE_ROOT_DEFAULT)
    }
    /** StorageArea.set() will only "update" according to keys, but will NOT delete already existed keys in StorageArea. So wee need to delete manually.
     */
    private removeDeprecatedRootKeys(newRoot: MyLocalStorageRoot): Promise<void> {
        return this.localArea.get().then((oldRoot) => {
            const oldKeys = Object.keys(oldRoot)
            const newKeys = Object.keys(newRoot)
            const deprecatedKeys: string[] = oldKeys.filter(k => !newKeys.includes(k))
            return this.localArea.remove(deprecatedKeys)
        })
    }
    public setRootArbitrary(newRoot: MyLocalStorageRoot): Promise<void> {
        // NOTE: StorageArea.set() will only "update" according to keys, but will NOT delete already existed keys in StorageArea. So wee need to delete manually.
        return this.localArea.set(newRoot as any)
    }
    /** Set data object (can be deeply partial) into LocalStorage. */
    public setRootSubsetPartially(subset: DeepPartial<MyLocalStorageRoot>): Promise<void> {
        const newRoot = deepCopy(subset)
        return this.getRoot().then((existingRoot) => {
            deepMergeSubset(existingRoot, newRoot)
            console.log('[SET] STORAGE, subset (new) ===', newRoot)
            console.log('[SET] STORAGE, merged (ori) ===', existingRoot)
            return this.localArea.set(existingRoot as any)
        })
    }
    public setRootSafelyIntoStorage(newRoot: MyLocalStorageRoot) {
        return this.getRoot().then((existingRoot) => {
            deepObjectShaper(newRoot, existingRoot)
            return this.localArea.set(newRoot as any)
        })
    }
    /**
     * - Get the whole LocalStorage data object
     * - You should call `initAndGetRoot()` at least one time (and wait it until
     *   resolved) before you call this function.
     * */
    public getRoot(): Promise<MyLocalStorageRoot> {
        return this.localArea.get().then((root) => {
            return root as unknown as MyLocalStorageRoot
        }).catch((err) => {
            console.error('Error when getting settings from browser.storage:', err)
            return this.initAndGetRoot()
        })
    }
    /** Get direct child of LocalStorage */
    public getDataFromRoot<K extends keyof MyLocalStorageRoot>(category: K): Promise<MyLocalStorageRoot[K]> {
        return this.getRoot().then((root) => {
            return root[category]
        })
    }
    public onOptionsChanged(cb: (changes: TypedChangeDict<MyLocalStorageRoot>) => void) {
        browser.storage.onChanged.addListener((_changes, areaName) => {
            const changes = _changes as TypedChangeDict<MyLocalStorageRoot>
            if (areaName === 'sync' || areaName === 'local') {
                if (changes.options) {
                    cb(changes)
                }
            }
        })
    }

}

export const storageManager = (typeof browser !== 'undefined' ? new StorageManager() : null) as StorageManager
