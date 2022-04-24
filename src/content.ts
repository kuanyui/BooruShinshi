import { FileTags, msgManager, MyMsg, ParsedImageInfo, supported_hostname_t, Tag } from "./common";
import { filename_template_token_t, MyOptions, MyStorageRoot, storageManager } from "./options";
import * as modules from './modules'
import { AbstractModule } from "./modules/abstract";
import { inPageNotify } from "./inpage-notify";

const ALL_MODULES: AbstractModule[] = [
     new modules.ModuleChanSankakuComplexCom(),
     new modules.ModuleKonachanCom(),
     new modules.ModuleKonachanNet(),
     new modules.ModuleYandeRe(),
     new modules.ModuleDanbooruDonmaiUs(),
     new modules.ModuleGelbooruCom(),
     new modules.ModuleSafebooruOrg(),
     new modules.ModuleTbibOrg(),
     new modules.ModuleAllthefallenMoe(),
     new modules.ModuleRule34XXX(),
     new modules.ModuleRule34PahealNet(),
     new modules.ModuleRule34Us(),
]

function getModuleInstance(): AbstractModule {
    for (const m of ALL_MODULES) {
        if (m.hostname() === location.hostname) {
            return m
        }
    }
    throw new Error('Not found module for this site.')
}

const curMod = getModuleInstance()

browser.runtime.onMessage.addListener((_ev: any) => {
    const ev = _ev as MyMsg
    if (ev.type === "AskTabToDownload") {
        showHideDownloadLinks()
    }
})
let OPTIONS = storageManager.getDefaultRoot().options
storageManager.getData('options').then((opts) => {
    OPTIONS = opts
    if (opts.ui.openLinkWithNewTab) {
        makeImgAlwaysOpenedWithNewTab()
    }
})
function fetchOptions(): Promise<MyOptions> {
    return storageManager.getData('options').then((opts) => {
        return OPTIONS = opts
    })
}

function makeImgAlwaysOpenedWithNewTab() {
    const selector: string = curMod.getPostLinkElementSelector()
    window.setTimeout(() => {
        document.querySelectorAll(selector).forEach(x => { _makeAnchorElementOpenedWithTab(x) })
    }, 3000)
    let timeoutId = -1
    const observer = new MutationObserver(function (mutations, me) {
        // TODO: The advertisements will trigger lots of unwanted mutations here. Maybe try to limit query within post link area.
        // console.log('mutations ===>', mutations.map(x=>x.target))
        // mutations.forEach(mut => mut.target.querySelectorAll(selector).forEach(x => { x.setAttribute('target', '_blank') }))
        // Debounce timeout
        window.clearTimeout(timeoutId)
        window.setTimeout(() => {
            document.querySelectorAll(selector).forEach(x => { _makeAnchorElementOpenedWithTab(x) })
        }, 2000)
    })
    observer.observe(window.document, {
        childList: true,
        subtree: true
    })
}


function _makeAnchorElementOpenedWithTab(el: Element) {
    const a = el as HTMLAnchorElement
    // el.setAttribute('target', '_blank')
    if (!a.href) { return }
    // @ts-ignore
    a.onclick = function (ev) {
        console.log('Shit', Date.now())
        ev.preventDefault()
        ev.stopPropagation()
        // Open with new tab, but don't focus to the new tab.
        msgManager.sendToBg({ type: 'OpenLinkInNewTab', url: a.href })
    }
}
function insertStyleElement () {
    if (document.getElementById('BooruShinshi_Style')) {
        return console.log('[BooruShinshi] Style has inserted, aborted.')
    }
    const css = `
    #BooruShinshi_DivForContentPage {
        position: fixed;
        right: 20px;
        top: 20px;
        background-color:  #fff;
        border: solid 1px #aaa;
        padding: 6px;
        z-index: 9999;
    }
    #BooruShinshi_DivForContentPage button {
        cursor: pointer;
        font-size: 2em;
        background: #E9E9ED;
        border: 1px solid #aaaaaa;
        color: #000000;
        padding: 0.4em 1.2em;
        display: block;
        width: 100%;
    }
    #BooruShinshi_DivForListPage {
        display: flex;
        flex-direction: column;
        position: fixed;
        left: 20px;
        bottom: 20px;
        background-color:  #fff;
        border: solid 1px #aaa;
        padding: 6px;
        z-index: 999999999;
    }
    #BooruShinshi_DivForListPage.moved {
        left: unset;
        right: 20px;
    }
    #BooruShinshi_DivForListPage .ButtonsContainer {
        display: flex;
    }
    #BooruShinshi_DivForListPage .ButtonsContainer button {
        cursor: pointer;
        font-size: 20px;
        background: #E9E9ED;
        border: 1px solid #aaaaaa;
        color: #000000;
        padding: 10px 20px;
        display: block;
    }
    #BooruShinshi_DivForListPage .LinksContainer {
        display: flex;
        flex-direction: column;
    }
    #BooruShinshi_DivForListPage .LinksContainer a {
        display: flex;
        text-decoration: none;
        font-size: 14px;
        padding: 8px 8px;
        color: #3388ff;
    }
    #BooruShinshi_DivForListPage .LinksContainer a:hover:not(.currentSite) {
        background: #eeeeee;
    }
    #BooruShinshi_DivForListPage .LinksContainer a:visited {
        color: #8833ff;
    }
    #BooruShinshi_DivForListPage .LinksContainer a.currentSite {
        color: #aaaaaa;
        cursor: not-allowed;
    }
    `
    const style = document.createElement('style')
    document.head.appendChild(style)
    style.id = 'BooruShinshi_Style'
    style.type = 'text/css'
    style.appendChild(document.createTextNode(css));
}

async function downloadImage(imgFileUrl: string) {
    await fetchOptions()
    const fileInfo = analyzeFileInfo(imgFileUrl)
    console.log('[DEBUG] fileInfo ===>', fileInfo)
    msgManager.sendToBg({
        type: 'DownloadLinkGotten',
        url: imgFileUrl,
        filename: fileInfo.filePath
    })
    if (OPTIONS.ui.showNotificationWhenStartingToDownload) {
        inPageNotify('Download Image', fileInfo.filePath)
    }
}

function templateReplacer(templateStr: string, token: filename_template_token_t, replaceValue: string): string {
    return templateStr.replaceAll(`%${token}%`, replaceValue)
}
function TAG_DESC_SORTER<T extends {count: number}> (a:T, b: T) { return b.count - a.count }

function generateFileBaseName(tagDict: FileTags): string {
    // template
    let fname = OPTIONS.fileName.fileNameTemplate
    const fnLenLimit = OPTIONS.fileName.fileNameMaxCharacterLength
    const tagSeparator = OPTIONS.fileName.tagSeparator
    fname = templateReplacer(fname, 'siteabbrev', curMod.abbrev())
    fname = templateReplacer(fname, 'sitefullname', curMod.fullName())
    // tags
    const postId = curMod.getPostId()
    fname = templateReplacer(fname, 'postid', postId + '')
    const artist: string = tagDict.artist[0] ? tagDict.artist[0].en : ''
    const studio: string = tagDict.studio[0] ? tagDict.studio[0].en : ''
    fname = templateReplacer(fname, 'artist', artist || studio || 'unknown_artist')
    const copyright: string = tagDict.copyright[0] ? tagDict.copyright[0].en : 'no series'
    fname = templateReplacer(fname, 'series', copyright)
    const character: string = tagDict.character[0] ? tagDict.character[0].en : ''
    fname = templateReplacer(fname, 'character', character)
    const generalsArr: string[] = []
    for (const x of tagDict.general) {
        if (generalsArr.join(tagSeparator).length + fname.length > fnLenLimit) {
            generalsArr.pop()
            break
         }
        generalsArr.push(x.en)
    }
    const generals = generalsArr.join(tagSeparator)
    fname = templateReplacer(fname, 'generals', generals)
    return fname
}

/** Return ext without dot. */
function guessExt (imgFileUrl: string): string | null {
    const m = imgFileUrl.match(/\b[.](jpe?g|png|gif|bmp|webp|webm|mp4|mkv)\b/i)
    if (m) { return m[1] }
    return null
}

interface FileInfo {
    /** file name without ext */
    fileBaseName: string
    fileExt: string
    /** basename + ext */
    fileFullName: string
    /** Relative path in ~/Downloads/ */
    folderPath: string
    /** Relative path in ~/Downloads/.
     * `{folderRelPath}/{fileFullName}` */
    filePath: string
}

function analyzeFileInfo(imgFileUrl: string): FileInfo {
    const fileTags: FileTags = curMod.collectTags()
    for (const [category, tags] of Object.entries(fileTags)) {
        tags.sort(TAG_DESC_SORTER)
        // To ensure maximum compatibility across different booru sites, lower case all tags.
        for (const tag of tags) {
            tag.en = tag.en.toLowerCase()
        }
    }
    fileTags.general.reverse()

    const basename = generateFileBaseName(fileTags)
    const ext = guessExt(imgFileUrl) || 'jpg'
    const fileFullName = `${basename}.${ext}`
    const folderPath = generateFolderPath(fileTags)
    const filePath = folderPath + "/" + fileFullName
    return {
        fileBaseName: basename,
        fileExt: ext,
        fileFullName: fileFullName,
        folderPath: folderPath,
        filePath: filePath,
    }
}

function tagPatternToRegexp(tagPattern: string): RegExp {
    const tmp = tagPattern
        .trim()
        .replaceAll('.', '[.]')
        .replaceAll('(', '\\(')
        .replaceAll(')', '\\)')
        .replaceAll('[', '\\[')
        .replaceAll(']', '\\]')
        .replaceAll('*', '.*')
    return new RegExp('^' + tmp + '$', '')
}
/** Always without `/` suffix */
function generateFolderPath(tagDict: FileTags): string {
    const final: string[] = []
    const ROOT_DIR_NAME = OPTIONS.folder.downloadFolderName
    if (ROOT_DIR_NAME) { final.push(ROOT_DIR_NAME) }
    if (!OPTIONS.folder.enableClassify) { return final.join('/') }
    const FILE_ALL_TAGS: string[] = Object.values(tagDict).flat(1).map(x=>x.en)
    const RULES = OPTIONS.folder.classifyRules
    console.log('FILE_ALL_TAGS====', FILE_ALL_TAGS)
    console.log('RULES====', RULES)
    rulesLoop:
    for (const r of RULES) {
        switch (r.ruleType) {
            case 'TagCategory': {
                const tags = tagDict[r.tagCategory]
                if (tags.length) {
                    final.push(r.folderName)
                    final.push(tags[0].en)
                    break rulesLoop
                }
                continue rulesLoop
            }
            case 'CustomTagMatcher': {
                let matched: boolean
                if (r.logicGate === 'AND') {
                    matched = r.ifContainsTag.every(tagPat => {
                        return FILE_ALL_TAGS.some(fileTag => fileTag.match(tagPatternToRegexp(tagPat)))
                    })
                } else {
                    matched = r.ifContainsTag.some(tagPat => {
                        return FILE_ALL_TAGS.some(fileTag => fileTag.match(tagPatternToRegexp(tagPat)))
                    })
                }
                if (matched) {
                    final.push(r.folderName)
                    break rulesLoop
                }
                continue rulesLoop
            }
            case 'Fallback': {
                final.push(r.folderName)
                break rulesLoop
            }
        }
    }
    return final.filter(x=>x).join('/')
}

async function showHideDownloadLinks() {
    const oriEl = document.getElementById('BooruShinshi_DivForContentPage')
    console.log('show hide', oriEl)
    if (oriEl) {
        oriEl.remove()
        return
    }
    insertStyleElement()
    const root = document.createElement('div')
    root.id = "BooruShinshi_DivForContentPage"
    const infoArr: ParsedImageInfo[] = curMod.collectImageInfoList()
    if ((await storageManager.getData('options')).ui.buttonForCloseTab) {
        const closeTab = document.createElement('button')
        closeTab.textContent = 'Close Tab'
        closeTab.onclick = () => msgManager.sendToBg({ type: 'CloseTab' })
        root.appendChild(closeTab)
        root.appendChild(document.createElement('hr'))
    }
    const buttonHidder = () => root.remove()
    for (const info of infoArr) {
        const btn = document.createElement('button')
        btn.textContent = info.btnText
        btn.onclick = () => {
            downloadImage(info.imgUrl)
            if (!btn.textContent!.startsWith('✔')) {
                btn.textContent = '✔' + btn.textContent
            }
        }
        root.appendChild(btn)
    }
    root.appendChild(document.createElement('hr'))
    const hideBtn = document.createElement('button')
    hideBtn.textContent = 'Hide Buttons'
    hideBtn.onclick = () => buttonHidder()
    root.appendChild(hideBtn)

    document.body.appendChild(root)
}

function createJumpButton() {
    const oriEl = document.getElementById('BooruShinshi_DivForListPage')
    if (oriEl) {
        oriEl.remove()
        return
    }
    insertStyleElement()
    const root = document.createElement('div')
    root.id = "BooruShinshi_DivForListPage"

    const foldBtn = document.createElement('button')
    foldBtn.textContent = 'Search in Other Sites'
    const moveBtn = document.createElement('button')
    moveBtn.textContent = 'Move'
    const buttonsContainer = document.createElement('div')
    buttonsContainer.className = 'ButtonsContainer'
    buttonsContainer.append(foldBtn)
    buttonsContainer.append(moveBtn)
    const linksContainer = document.createElement('div')
    linksContainer.className = 'LinksContainer'
    linksContainer.style.display = 'none'
    root.appendChild(linksContainer)
    root.appendChild(buttonsContainer)

    const queriedTags = curMod.getCurrentQueryList()
    for (const mod of ALL_MODULES) {
        const a = document.createElement('a')
        a.textContent = mod.hostname()
        a.href = mod.makeQueryUrl(queriedTags)
        if (mod.hostname() === location.hostname) {
            a.classList.add('currentSite')
            a.textContent += ' (Current)'
        }
        linksContainer.appendChild(a)
    }
    let expanded = false
    foldBtn.onclick = () => {
        expanded = !expanded
        linksContainer.style.display = expanded ? 'flex' : 'none'
    }
    moveBtn.onclick = () => {
        if (root.classList.contains('moved')) {
            root.classList.remove('moved')
        } else {
            root.classList.add('moved')
        }
    }

    document.body.appendChild(root)
}

function setupPostContentPage() {
    console.log('[Post Content] setup for post content page')
    const observer = new MutationObserver(function (mutations, me) {
        const watchElemArr: Array<Element | null> = curMod.getPostContentPagePendingElements()
        console.log('document changed!', watchElemArr)
        if (watchElemArr.every(x => !!x)) {
            console.log('document with key elements rendered!', watchElemArr)
            me.disconnect() // stop observing
            showHideDownloadLinks()
            return
        }
    })
    observer.observe(document, {
        childList: true,
        subtree: true
    })
}

function setupPostListPage() {
    console.log('[Post List] setup for post list page')
    const observer = new MutationObserver(function (mutations, me) {
        if (document.body) {
            createJumpButton()
            me.disconnect()
        }
    })
    observer.observe(document, {
        childList: true,
        subtree: true
    })
}

function main() {
    const isList = curMod.inPostListPage()
    const isContent = curMod.inPostContentPage()
    if (isList && isContent) {
        console.error('[To Developer] This should not be happened. This may cause potential error.')
    }
    if (isList) {
        setupPostListPage()
    } else if (isContent) {
        setupPostContentPage()
    } else {
        console.warn(`[module::${curMod.hostname()}] Not supported page.`)
    }
}

main()
