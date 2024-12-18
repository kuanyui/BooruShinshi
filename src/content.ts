import { ALL_TAG_CATEGORY, assertUnreachable, createDebounceFunction, createEl, FileTags, msgManager, MyMsg, ParsedImageInfo, ParsedImageResolutionClass, supported_hostname_t, Tag, toHtmlEntities } from "./common";
import { filename_template_token_t, MyLocalOptions, MyLocalStorageRoot, storageManager } from "./options";
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
        setPostTool({ show: true })
    }
})
let OPTIONS = storageManager.getDefaultRoot().options
storageManager.getDataFromRoot('options').then((opts) => {
    OPTIONS = opts
    if (opts.ui.openLinkWithNewTab) {
        makeImgAlwaysOpenedWithNewTab()
    }
})
function fetchOptions(): Promise<MyLocalOptions> {
    return storageManager.getDataFromRoot('options').then((opts) => {
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
        filename: req.downloadFileFullPath,
        referer: window.location.origin,
    })
    if (OPTIONS.ui.showNotificationWhenStartingToDownload) {
        const fileNameHtml = `<div>${toHtmlEntities(req.downloadFileFullPath)}</div>`
        inPageNotify('Download Image', fileNameHtml, true, 6000)
    }
}

function templateReplacer(templateStr: string, token: filename_template_token_t, replaceValue: string): string {
    replaceValue = extraSanitizerForFilePathSegment(replaceValue)
    return templateStr.replaceAll(`%${token}%`, replaceValue)
}
function TAG_CATEGORY_SORTER(a: tag_category_t, b: tag_category_t) { return ALL_TAG_CATEGORY.indexOf(a) - ALL_TAG_CATEGORY.indexOf(b) }

/** Fix some strange extra special condition.
 * To avoid error like `download failed: Error: filename must not contain illegal characters`
 */
function extraSanitizerForFilePathSegment(filePathSegmentation: string): string {
    return filePathSegmentation
        .replace(/[.]/g, "．") // (ex: `n.g.`) Actually I think this is a bug of Firefox because this is allow in UNIX file name.
        .replace(/[/]/g, "／") // (ex: `ranma_1/2`)
        .replace(/[:]/g, "：") // (ex: `16:9`) For Windows, Android file system compatibility
}

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
    const artistInFn: string = tagDict.artist[0] ? tagDict.artist[0].en : ''
    const studioInFn: string = tagDict.studio[0] ? tagDict.studio[0].en : ''
    fname = templateReplacer(fname, 'artist', artistInFn || studioInFn || 'unknown_artist')
    const artistsInFn: string = tagDict.artist[0] ? tagDict.artist.map((tag) => tag.en).join(',') : 'unknown_artists'
    fname = templateReplacer(fname, 'artists', artistsInFn)
    const studiosInFn: string = tagDict.studio[0] ? tagDict.studio.map((tag) => tag.en).join(',') : 'no_studios'
    fname = templateReplacer(fname, 'studios', studiosInFn)
    const copyrightInFn: string = tagDict.copyright[0] ? tagDict.copyright[0].en : 'no series'
    fname = templateReplacer(fname, 'series', copyrightInFn)
    const characterInFn: string = tagDict.character[0] ? tagDict.character[0].en : ''
    fname = templateReplacer(fname, 'character', characterInFn)
    const generalsArr: string[] = []
    for (const tag of tagDict.general) {
        if (generalsArr.join(tagSeparator).length + fname.length > fnLenLimit) {
            generalsArr.pop()
            break
         }
        generalsArr.push(tag.en)
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

/**
 * TODO: if forceDirClassify is defined, it will be used to generate file name.
 * This is usable, for example, an image has multiple characters, but you want
 * only on character appears in the filename.
 */
function generateFileNameInfoByTags(opts: {
    imgFileUrl: string,
    fileTags: FileTags,
    // forceDirClassify?: {
    //     tagCategory: tag_category_t,
    //     tagName: string
    // }
}): FileInfo {
    for (const [category, tags] of Object.entries(opts.fileTags)) {
        // To ensure maximum compatibility across different booru sites, lower case all tags.
        for (const tag of tags) {
            tag.en = tag.en.toLowerCase()
        }
        sortTags(tags, TagSortingMethod.ByCount_Descending)
        sortTagsByPreferredTags(tags)
    }

    const basename = generateFileBaseNameByTags(opts.fileTags)
    const ext = guessExt(opts.imgFileUrl) || 'jpg'
    const fileFullName = `${basename}.${ext}`
    return {
        fileBaseName: basename,
        fileExt: ext,
        fileFullName: fileFullName
    }
}

function sortTagsByPreferredTags(tags: Tag[]): void {
    const patternRegexList: RegExp[] = OPTIONS.fileName.preferredTags.trim().split(/[ \n]+/).filter(x => x).map((tagPat) => {
        return tagPatternToRegexp(tagPat)
    })
    tags.sort((tagA, tagB) => {
        const a = patternRegexList.findIndex((preferredRegex) => !!tagA.en.match(preferredRegex))
        const b = patternRegexList.findIndex((preferredRegex) => !!tagB.en.match(preferredRegex))
        if (a === -1 && b === -1) { return 0 }
        if (a !== -1 && b === -1) { return -1 }   // a is preferred (it's inside preferredTags)
        if (a === -1 && b !== -1) { return 1 }    // b is preferred (it's inside preferredTags)
        return a - b
    })
}

function tagPatternToRegexp(tagPattern: string): RegExp {
    const tmp = tagPattern
        .trim()
        .replaceAll('\\*', '[*]')
        .replaceAll('.', '[.]')
        .replaceAll('(', '\\(')
        .replaceAll(')', '\\)')
        .replaceAll('[', '\\[')
        .replaceAll(']', '\\]')
        .replaceAll('*', '.*')
    return new RegExp('^' + tmp + '$', 'i')
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
        const ruleFolderPathSegs: string[] = r.folderName.split('/')
        switch (r.ruleType) {
            case 'TagCategory': {
                const tags = opts.fileTags[r.tagCategory]
                if (tags.length) {
                    const enTag = tags[0].en
                    // Avoid using some tags in file path because they are undistinguishing in directory hierarchy.
                    if ( (['original', 'origin', 'tagme', 'unknown'].includes(enTag)) ) { continue }
                    if (enTag.match(/(copyright|character|artist)_request/)) { continue }
                    final.push(...ruleFolderPathSegs)
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
                    final.push(...ruleFolderPathSegs)
                    break rulesLoop
                }
                continue rulesLoop
            }
            case 'Fallback': {
                final.push(...ruleFolderPathSegs)
                break rulesLoop
            }
        }
    }
    return final.filter(x=>x).map(x => extraSanitizerForFilePathSegment(x)).join('/')
}


async function setPostTool(opts: { show: boolean }) {
    await fetchOptions()
    const oriEl = document.getElementById('BooruShinshi_PostToolsRoot')
    if (oriEl) {
        oriEl.remove()
    }
    if (!opts.show) {
        return
    }
    const root = document.createElement('div')
    root.id = "BooruShinshi_PostToolsRoot"
    const infoArr: ParsedImageInfo[] = curMod.collectImageInfoList()
    if (OPTIONS.ui.buttonForCloseTab) {
        root.appendChild(createCloseTabButton())
        root.appendChild(document.createElement('hr'))
    }
    for (const info of infoArr) {
        const buttonsRow = document.createElement('div')
        buttonsRow.className = 'ButtonsRow'
        buttonsRow.appendChild(createDirectDownloadButtonForImage(info))
        buttonsRow.appendChild(createActionsEntryButtonForImage(info))
        root.appendChild(buttonsRow)
    }
    root.appendChild(document.createElement('hr'))
    const hideBtn = document.createElement('button')
    hideBtn.textContent = 'Hide Buttons'
    hideBtn.onclick = () => root.remove()
    root.appendChild(hideBtn)

    document.body.appendChild(root)
}

function createCloseTabButton(): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.textContent = 'Close Tab'
    btn.onclick = () => msgManager.sendToBg({ type: 'CloseTab' })
    return btn
}
function getTooltipParentElement(): Element {
    const EL_ID = '__BooruShinshi__Tooltips__'
    let el = document.getElementById(EL_ID)
    if (el) { return el }
    el = document.createElement('div')
    el.id = EL_ID
    document.body.appendChild(el)
    return el
}
enum TagSortingMethod {
    ByCount_Descending = 1,
    ByCount_Ascending = 2,
}

function sortTags(tags: Tag[], sortMethod: TagSortingMethod): Tag[] {
    switch (sortMethod) {
        case TagSortingMethod.ByCount_Ascending: return tags.sort((a,b) => a.count - b.count)
        case TagSortingMethod.ByCount_Descending: return tags.sort((a,b) => b.count - a.count)
    }
}

function sortFileTags(fileTags: FileTags, sortMethod: TagSortingMethod): FileTags {
    for (const k of Object.keys(fileTags) as tag_category_t[]) {
        const tags = fileTags[k]
        sortTags(tags, sortMethod)
    }
    return fileTags
}

function createDirectDownloadButtonForImage(imgInfo: ParsedImageInfo): HTMLButtonElement {
    const label: string = imgInfo.btnText
    const imgUrl: string = imgInfo.imgUrl
    const btn = document.createElement('button')
    btn.textContent = label
    tippy(btn, {
        delay: [0, 0], allowHTML: true, placement: "left", appendTo: getTooltipParentElement(),
        content: () => {
            const fileTags = sortFileTags(curMod.collectTags(), TagSortingMethod.ByCount_Descending)
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
        const fileTags = sortFileTags(curMod.collectTags(), TagSortingMethod.ByCount_Descending)
        const fileDirPath = generateClassifiedDirPath({ fileTags: fileTags })
        const fileNameInfo = generateFileNameInfoByTags({ imgFileUrl: imgUrl, fileTags: fileTags })
        if (imgInfo.resClass === ParsedImageResolutionClass.HighRes) {
            btn.textContent = '⏳' + btn.textContent
            await curMod.prepareForFullSizeDownload()
            btn.textContent = btn.textContent.slice('⏳'.length)
        }
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
function createActionsEntryButtonForImage(imgInfo: ParsedImageInfo): HTMLButtonElement {
    const entryBtn = document.createElement('button')
    entryBtn.textContent = "As..."
    entryBtn.className = "asBtn"
    tippy(entryBtn, { delay: [500, 0], allowHTML: true, placement: "left", appendTo: getTooltipParentElement(), content: "Manually select classification directory.<br/>(Ignore your defined rules)" })
    entryBtn.onclick = () => {
        // Remove all buttons from root
        const rootEl = document.getElementById('BooruShinshi_PostToolsRoot')
        if (!rootEl) { console.error('[To Developer] Impossible bug.'); return }
        rootEl.innerHTML = ''
        if (OPTIONS.ui.buttonForCloseTab) {
            rootEl.appendChild(createCloseTabButton())
            rootEl.appendChild(document.createElement('hr'))
        }
        const backBtn = document.createElement('button')
        // Create new buttons by tags
        const categories = Object.entries(curMod.collectTags()) as [tag_category_t, Tag[]][]
        categories.sort((a,b) => TAG_CATEGORY_SORTER(a[0], b[0]))
        for (const [categoryId, tags] of categories) {
            if (tags.length === 0) { continue }
            if (categoryId === 'meta') { continue}
            if (categoryId === 'general') { continue }
            for (const tag of tags) {
                const btn = document.createElement('button')
                btn.className = `category__${categoryId}`
                rootEl.appendChild(btn)
                btn.innerHTML = `<span class="categoryType">${categoryId}</span> / ${toHtmlEntities(tag.en)}`
                tippy(btn, {
                    delay: [0, 0], allowHTML: true, placement: "left", appendTo: getTooltipParentElement(),
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
                    const fileNameInfo = generateFileNameInfoByTags({ imgFileUrl: imgInfo.imgUrl, fileTags: fileTags })
                    if (imgInfo.resClass === ParsedImageResolutionClass.HighRes) {
                        btn.textContent = '⏳' + btn.textContent
                        await curMod.prepareForFullSizeDownload()
                        btn.textContent = btn.textContent.slice('⏳'.length)
                    }
                    downloadImage({
                        imageFileUrl: imgInfo.imgUrl,
                        downloadFileFullPath: fileDirPath + '/' + fileNameInfo.fileBaseName
                    })
                    if (!btn.textContent!.startsWith('✔')) {
                        btn.textContent = '✔' + btn.textContent
                    }
                }
            }
        }
        rootEl.appendChild(document.createElement('hr'))
        backBtn.textContent = `← Back`
        backBtn.onclick = () => setPostTool({ show: true })
        rootEl.appendChild(backBtn)


    }
    return entryBtn
}

async function createPaginatorButton() {
    console.log('[BooruShinshi] createPaginatorButton()')
    if (!(await storageManager.getDataFromRoot('options')).ui.paginationButtons) {
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
    console.log('[BooruShinshi] createJumpButton()')
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
        const aEl = document.createElement('a')
        aEl.href = mod.makeQueryUrl(queriedTags)
        const faviconEl = document.createElement('img')
        faviconEl.className = "FaviconImage"
        faviconEl.src = browser.runtime.getURL(`img/favicons/${mod.favicon()}`)
        const textEl = document.createElement('span')
        textEl.className = "WebsiteTitleText"
        textEl.textContent = mod.hostname()
        aEl.appendChild(faviconEl)
        aEl.appendChild(textEl)
        if (mod.hostname() === location.hostname) {
            aEl.classList.add('currentSite')
            textEl.textContent += ' (Current)'
        }
        tippy(aEl, {
            zIndex: 999999999 + 1,
            placement: "right",
            delay: [0, 0], allowHTML: true, appendTo: getTooltipParentElement(),
            content: () => {
                return `<b>${mod.fullName()}</b><br/>
                <span>Rating: ${mod.containsHentai() ? "🔞 へんたい" : "🔰 セーフ" }<span>`
            }
        })
        linksContainer.appendChild(aEl)
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
    console.log('[BooruShinshi][Post Content] setup MutationObserver for post content page')
    const observer = new MutationObserver(function (mutations, me) {
        if (curMod.ifPostContentPageIsReady()) {
            console.log('[BooruShinshi][Post Content Page] document with key elements rendered! Insert HTML element and stop MutationObserver')
            me.disconnect() // stop observing
            setPostTool({ show: true })
            return
        }
    })
    observer.observe(document, {
        childList: true,
        subtree: true
    })
}

function removeResultFromPostsList() {
    console.log('[BooruShinshi] removeResultFromPostsList()')
    const blockedTags: string[] = OPTIONS.ux.blockedTags.trim().split(/[ \n]+/).filter(x => x)
    if (OPTIONS.ux.excludeAiGenerated) {
        blockedTags.push(
            '*ai_generator*',
            '*ai_generated*',
            '*ai-created*',
            'sankaku_ai',
        )
    }
    console.log("BLOCK LIST:", blockedTags)
    const blockedTagRegexpList: RegExp[] = blockedTags.map((tagPatt) => tagPatternToRegexp(tagPatt))
    const posts = curMod.getTaggedPostsInPostsList()
    for (const post of posts) {
        // console.log(post.element, post.tags)
        if (post.tags.find((tag) => blockedTagRegexpList.find(bTagRE => tag.match(bTagRE)))) {
            post.element.remove()
        }
    }
}

function setupPostListPage() {
    console.log('[BooruShinshi][Post List] setup for post list page')
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
            if (!curMod.isPostListAutoPaging()) {
                me.disconnect()
            }
        }
    })
    observer.observe(document, {
        childList: true,
        subtree: true
    })
}

async function main() {
    console.log('[BooruShinshi] content.js main()')
    await fetchOptions()
    const isList = curMod.inPostListPage()
    const isContent = curMod.inPostContentPage()
    if (isList && isContent) {
        console.error('[BooruShinshi][To Developer] This should not be happened. This may cause potential error.')
    }
    if (isList) {
        setupPostListPage()
    } else if (isContent) {
        setupPostContentPage()
    } else {
        console.warn(`[BooruShinshi][module::${curMod.hostname()}] Not supported page. \n(If you see this message but this page is expected to be supported, this usually means this module needs to be updated.)`)
    }
}

main()
