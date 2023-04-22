import { assertUnreachable, createDebounceFunction, createEl, FileTags, msgManager, MyMsg, ParsedImageInfo, supported_hostname_t, Tag, tag_category_able_to_be_forced_specified_t, toHtmlEntities } from "./common";
import { filename_template_token_t, MyOptions, MyStorageRoot, storageManager } from "./options";
import ALL_MODULE_CLASS from './modules'
import { AbstractModule } from "./modules/abstract";
import { inPageNotify } from "./inpage-notify";
import { tag_category_t } from "./common";
import tippy from "tippy.js";

const ALL_MODULES: AbstractModule[] = ALL_MODULE_CLASS.map(kls => new kls())


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
        showPostTool(true)
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
    const domChanger = createDebounceFunction(() => {
        curMod.getLinkElementsToPost().forEach(anchorEl => { _makeAnchorElementOpenedWithTab(anchorEl) })
    }, 100)
    const observer = new MutationObserver(function (mutations, me) {
        // TODO: The advertisements will trigger lots of unwanted mutations here. Maybe try to limit query within post link area.
        // console.log('mutations ===>', mutations.map(x=>x.target))
        // mutations.forEach(mut => mut.target.querySelectorAll(selector).forEach(x => { x.setAttribute('target', '_blank') }))
        domChanger()
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
        ev.preventDefault()
        ev.stopPropagation()
        // Open with new tab, but don't focus to the new tab.
        msgManager.sendToBg({ type: 'OpenLinkInNewTab', url: a.href })
    }
}

interface DownloadRequest {
    imageFileUrl: string
    downloadFileFullPath: string
}

async function downloadImage(req: DownloadRequest) {
    msgManager.sendToBg({
        type: 'DownloadLinkGotten',
        url: req.imageFileUrl,
        filename: req.downloadFileFullPath
    })
    if (OPTIONS.ui.showNotificationWhenStartingToDownload) {
        const fileNameHtml = `<div>${toHtmlEntities(req.downloadFileFullPath)}</div>`
        inPageNotify('Download Image', fileNameHtml, true, 6000)
    }
}

function templateReplacer(templateStr: string, token: filename_template_token_t, replaceValue: string): string {
    return templateStr.replaceAll(`%${token}%`, replaceValue)
}
function TAG_DESC_SORTER<T extends {count: number}> (a:T, b: T) { return b.count - a.count }

function generateFileBaseNameByTags(tagDict: FileTags): string {
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
}

interface FileDownloadTarget {
    /** Relative path in ~/Downloads/ */
    folderPath: string
    /** Relative path in ~/Downloads/.
     * `{folderRelPath}/{fileFullName}` */
    filePath: string
}

function generateFileNameInfoByTags(opts: {
    imgFileUrl: string,
    fileTags: FileTags,
}): FileInfo {
    for (const [category, tags] of Object.entries(opts.fileTags)) {
        tags.sort(TAG_DESC_SORTER)
        // To ensure maximum compatibility across different booru sites, lower case all tags.
        for (const tag of tags) {
            tag.en = tag.en.toLowerCase()
        }
    }
    opts.fileTags.general.reverse()

    const basename = generateFileBaseNameByTags(opts.fileTags)
    const ext = guessExt(opts.imgFileUrl) || 'jpg'
    const fileFullName = `${basename}.${ext}`
    return {
        fileBaseName: basename,
        fileExt: ext,
        fileFullName: fileFullName
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
function generateClassifiedDirPath(opts: {
    fileTags: FileTags,
    forceDirClassify?: {
        tagCategory: tag_category_t,
        tagName: string
    }
}): string {
    const final: string[] = []
    const ROOT_DIR_NAME = OPTIONS.folder.downloadFolderName
    if (ROOT_DIR_NAME) { final.push(ROOT_DIR_NAME) }
    if (!OPTIONS.folder.enableClassify) { return final.join('/') }
    if (opts.forceDirClassify) {
        final.push(`__ASSIGNED__${opts.forceDirClassify.tagCategory}`)
        final.push(opts.forceDirClassify.tagName)
        return final.join('/')
    }
    const FILE_ALL_TAGS: string[] = Object.values(opts.fileTags).flat(1).map(x=>x.en)
    const userDefinedRules = OPTIONS.folder.classifyRules
    console.log('FILE_ALL_TAGS====', FILE_ALL_TAGS)
    console.log('RULES====', userDefinedRules)
    rulesLoop:
    for (const r of userDefinedRules) {
        switch (r.ruleType) {
            case 'TagCategory': {
                const tags = opts.fileTags[r.tagCategory]
                if (tags.length) {
                    const enTag = tags[0].en
                    // Avoid to use some tags in file path because they are undistinguishing in directory hierarchy.
                    if ( (['original', 'origin', 'tagme', 'unknown'].includes(enTag)) ) { continue }
                    final.push(r.folderName)
                    final.push(enTag)
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

async function showPostTool(show: boolean) {
    await fetchOptions()
    const oriEl = document.getElementById('BooruShinshi_PostToolsRoot')
    if (oriEl) {
        oriEl.remove()
    }
    if (!show) {
        return
    }
    const root = document.createElement('div')
    root.id = "BooruShinshi_PostToolsRoot"
    const infoArr: ParsedImageInfo[] = curMod.collectImageInfoList()
    if (OPTIONS.ui.buttonForCloseTab) {
        const closeTab = document.createElement('button')
        closeTab.textContent = 'Close Tab'
        closeTab.onclick = () => msgManager.sendToBg({ type: 'CloseTab' })
        root.appendChild(closeTab)
        root.appendChild(document.createElement('hr'))
    }
    for (const info of infoArr) {
        const buttonsRow = document.createElement('div')
        buttonsRow.className = 'ButtonsRow'
        buttonsRow.appendChild(createDirectDownloadButtonForImage(info.btnText, info.imgUrl))
        buttonsRow.appendChild(createActionsEntryButtonForImage(info.imgUrl))
        root.appendChild(buttonsRow)
    }
    root.appendChild(document.createElement('hr'))
    const hideBtn = document.createElement('button')
    hideBtn.textContent = 'Hide Buttons'
    hideBtn.onclick = () => root.remove()
    root.appendChild(hideBtn)

    document.body.appendChild(root)
}

function createDirectDownloadButtonForImage(label: string, imgUrl: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.textContent = label
    tippy(btn, {
        delay: [0, 0], allowHTML: true,
        content: () => {
            const fileTags = curMod.collectTags()
            const fileDirPath = generateClassifiedDirPath({ fileTags: fileTags })
            let tmp = `<div style="font-size: 12px; opacity: 0.7; font-style: italic;">Download directly according to the classify rules you've defined.</div>`
            tmp += `<b>`
            tmp += fileDirPath.split('/').map(toHtmlEntities).join(`<span style="color: #59f;"> / </span>`)
            tmp += `</b>`
            return tmp
        }
    })
    btn.onclick = async () => {
        await fetchOptions()
        const fileTags = curMod.collectTags()
        const fileDirPath = generateClassifiedDirPath({ fileTags: fileTags })
        const fileNameInfo = generateFileNameInfoByTags({ imgFileUrl: imgUrl, fileTags: fileTags })
        downloadImage({
            imageFileUrl: imgUrl,
            downloadFileFullPath: fileDirPath + '/' + fileNameInfo.fileFullName
        })
        if (!btn.textContent!.startsWith('✔')) {
            btn.textContent = '✔' + btn.textContent
        }
    }
    return btn
}
function createActionsEntryButtonForImage(imgUrl: string): HTMLButtonElement {
    const entryBtn = document.createElement('button')
    entryBtn.textContent = "As..."
    entryBtn.className = "asBtn"
    tippy(entryBtn, { delay: [500, 0], allowHTML: true, content: "Manually select classification directory.<br/>(Ignore your defined rules)" })
    entryBtn.onclick = () => {
        // Remove all buttons from root
        const rootEl = document.getElementById('BooruShinshi_PostToolsRoot')
        if (!rootEl) { console.error('[To Developer] Impossible bug.'); return }
        rootEl.innerHTML = ''
        const backBtn = document.createElement('button')
        backBtn.textContent = `← Back`
        backBtn.onclick = () => showPostTool(true)
        rootEl.appendChild(backBtn)
        rootEl.appendChild(document.createElement('hr'))
        // Create new buttons by tags
        for (const [_categoryId, tags] of Object.entries(curMod.collectTags())) {
            const categoryId = _categoryId as tag_category_t
            if (tags.length === 0) { continue }
            if (categoryId === 'meta') { continue}
            if (categoryId === 'general') { continue }
            for (const tag of tags) {
                const btn = document.createElement('button')
                rootEl.appendChild(btn)
                btn.textContent = `${categoryId} / ${tag.en}`
                tippy(btn, {
                    delay: [0, 0], allowHTML: true,
                    content: () => {
                        const fileTags = curMod.collectTags()
                        const fileDirPath = generateClassifiedDirPath({
                            fileTags: fileTags,
                            forceDirClassify: { tagCategory: categoryId, tagName: tag.en }
                        })
                        let tmp = `<div style="font-size: 12px; opacity: 0.7; font-style: italic;">Manually select classification directory.</div>`
                        tmp += `<b>`
                        tmp += fileDirPath.split('/').map(toHtmlEntities).join(`<span style="color: #59f;"> / </span>`)
                        tmp += `</b>`
                        return tmp
                    }
                })
                btn.onclick = async () => {
                    await fetchOptions()
                    const fileTags = curMod.collectTags()
                    const fileDirPath = generateClassifiedDirPath({
                        fileTags: fileTags,
                        forceDirClassify: { tagCategory: categoryId, tagName: tag.en }
                    })
                    const fileNameInfo = generateFileNameInfoByTags({ imgFileUrl: imgUrl, fileTags: fileTags })
                    downloadImage({
                        imageFileUrl: imgUrl,
                        downloadFileFullPath: fileDirPath + '/' + fileNameInfo.fileBaseName
                    })
                    if (!btn.textContent!.startsWith('✔')) {
                        btn.textContent = '✔' + btn.textContent
                    }
                }
            }
        }

    }
    return entryBtn
}

async function createPaginatorButton() {
    if (!(await storageManager.getData('options')).ui.paginationButtons) {
        return
    }
    const oriEl = document.getElementById('BooruShinshi_Paginator')
    if (oriEl) { oriEl.remove() }
    const root = createEl('div', {
        id: "BooruShinshi_Paginator",
    })
    const pagi = curMod.getPaginationInfo()
    console.log('pagi===', pagi)
    const prevBtn = createEl('a', { textContent: '←', href: pagi.prevPageUrl || 'javascript:;', disabled: !pagi.prevPageUrl })
    const nextBtn = createEl('a', { textContent: '→', href: pagi.nextPageUrl || 'javascript:;', disabled: !pagi.nextPageUrl })
    root.append(prevBtn, nextBtn)
    document.body.appendChild(root)
}
function createJumpButton() {
    const oriEl = document.getElementById('BooruShinshi_QueryJumper')
    if (oriEl) {
        oriEl.remove()
    }
    const root = createEl('div', {
        id: "BooruShinshi_QueryJumper",
        className: "BooruShinshi_DivForListPage",
    })
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
        if (curMod.ifPostContentPageIsReady()) {
            console.log('document with key elements rendered!')
            me.disconnect() // stop observing
            showPostTool(true)
            return
        }
    })
    observer.observe(document, {
        childList: true,
        subtree: true
    })
}

function removeResultFromPostsList() {
    if (OPTIONS.ux.excludeAiGenerated) {
        for (const x of curMod.getTaggedPostsInPostsList()) {
            console.log(x.element, x.tags)
            if (x.tags.includes('ai_generated')) {
                x.element.remove()
            }
        }
    }
}

function setupPostListPage() {
    console.log('[Post List] setup for post list page')
    let jumpButtonCreated = false
    let paginatorButtonCreated = false
    const observer = new MutationObserver(function (mutations, me) {
        if (!document.body) { return }
        if (!jumpButtonCreated) {
            jumpButtonCreated = true
            createJumpButton()
        }
        if (!paginatorButtonCreated) {
            if (curMod.ifPostLinkPageIsReady()) {
                paginatorButtonCreated = true
                createPaginatorButton()
            }
        }
        if (jumpButtonCreated && paginatorButtonCreated) {
            removeResultFromPostsList()
            me.disconnect()
        }
    })
    observer.observe(document, {
        childList: true,
        subtree: true
    })
}

async function main() {
    await fetchOptions()
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
