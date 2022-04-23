/*!
 * Copyright (c) 2021-2022 ono ono (kuanyui) All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0 (MPL-2.0). If a copy of the MPL was not distributed with this file,
 * You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * You may not remove or alter the substance of any license notices (including
 * copyright notices, patent notices, disclaimers of warranty, or limitations of
 * liability) contained within the Source Code Form of the Covered Software,
 * except that You may alter any license notices to the extent required to
 * remedy known factual inaccuracies. (Cited from MPL - 2.0, chapter 3.3)
 */

import { tag_category_t } from "../common"
import { ALL_FILENAME_TEMPLATE_TOKEN, ALL_RULE_TYPE, FilenameTemplateTokenDict, FolderClassifyRule, FolderClassifyRule__custom, options_ui_input_query_t, rule_type_t, storageManager } from "../options"
import * as elHelper from './components'
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'


function q<T extends HTMLElement, U extends string = string>(query: U): T {
    const el = document.querySelector(query)
    if (!el) { throw new TypeError(`[To Developer] The element query ${query} is not found`) }
    return el as T
}

function qs<T extends HTMLElement>(query: string): NodeListOf<T> {
    const res = document.querySelectorAll(query)
    if (!res) { throw new TypeError(`[To Developer] The element query ${query} is not found`) }
    return res as NodeListOf<T>
}


function getSelectValue<T extends options_ui_input_query_t>(id: T): string {
    return q<HTMLSelectElement>(id).value
}
function setSelectValue<T extends options_ui_input_query_t>(id: T, value: string) {
    q<HTMLSelectElement>(id).value = value
}
function getRadioValue(radioGroupName: string): string {
    const radioList = document.querySelectorAll<HTMLInputElement>(`input[name="${radioGroupName}"]`)
    for (const radio of radioList) {
        if (radio.checked) {
            return radio.value
        }
    }
    return ''
}
function setRadioValue(radioGroupName: string, value: string) {
    const radioList = document.querySelectorAll<HTMLInputElement>(`input[name="${radioGroupName}"]`)
    for (const radio of radioList) {
        if (radio.value === value) {
            radio.checked = true
            return
        }
    }
}
function getCheckboxValue<T extends options_ui_input_query_t>(id: T): boolean {
    return q<HTMLInputElement>(id).checked
}
function setCheckboxValue<T extends options_ui_input_query_t>(id: T, checked: boolean) {
    q<HTMLInputElement>(id).checked = checked
}
function getTextAreaValue<T extends options_ui_input_query_t>(id: T): string {
    return q<HTMLTextAreaElement>(id).value
}
function setTextAreaValue<T extends options_ui_input_query_t>(id: T, value: string) {
    q<HTMLTextAreaElement>(id).value = value
}
function setContentEditableValue<T extends options_ui_input_query_t>(id: T, value: string) {
    q<HTMLDivElement>(id).innerText =value
}

function swap<T>(arr: T[], i: number, j: number): void {
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
}
function objectShaper<T, U>(ori: T, wishedShape: U): void {
    for (const k in ori) {
        if (!Object.keys(wishedShape).includes(k)) {
            delete ori[k]
        }
    }
    for (const k in wishedShape) {
        if (!Object.keys(ori).includes(k)) {
            // @ts-expect-error
            ori[k] = wishedShape[k]
        }
    }
}
type rule_index_t = number
class RuleTableHandler {
    private __curIdx: rule_index_t = -1
    private tbodyRef = q<HTMLTableSectionElement>('#classifyRuleTableContainer table tbody')!
    public model: FolderClassifyRule[] = []
    private btns = {
        add: q<HTMLButtonElement>('.actBtn.add'),
        del: q<HTMLButtonElement>('.actBtn.delete'),
        moveTop: q<HTMLButtonElement>('.actBtn.moveTop'),
        moveUp: q<HTMLButtonElement>('.actBtn.moveUp'),
        moveDown: q<HTMLButtonElement>('.actBtn.moveDown'),
        moveBottom: q<HTMLButtonElement>('.actBtn.moveBottom'),
    }
    public onchange: (newVal: FolderClassifyRule[]) => any = (newVal: FolderClassifyRule[]) => undefined
    constructor() {
        this.buildTable()
        this.buildButtons()
    }
    get curIdx(): rule_index_t { return this.__curIdx }
    set curIdx(nv: rule_index_t) {
        this.__curIdx = nv
        this.highlightSelectedRule()
        this.renderButtons()
    }
    public setModel(newArr: FolderClassifyRule[]) {
        console.log('setModel', newArr)
        this.model = newArr
        this.buildTable()
    }
    private selectRule(rule: FolderClassifyRule) {
        const i = this.model.indexOf(rule)
        this.curIdx = i
    }
    private highlightSelectedRule() {
        for (const tr of this.tbodyRef.children) {
            tr.classList.remove('highlighted')
        }
        if (this.curIdx === -1) { return }
        this.tbodyRef.children.item(this.curIdx)!.classList.add('highlighted')
    }
    private rerender() {
        this.renderTable()
        this.renderButtons()
    }
    private renderTable() {
        const allRows = document.querySelectorAll('tr.engineRow')
        allRows.forEach(x => x.classList.remove('active'))
        if (this.curIdx) {
            for (const x of allRows) {
                const value = ~~(x.getAttribute('value') || 0)
                if (value === this.curIdx) {
                    x.classList.add('active')
                    return
                }
            }
        }
    }
    private renderButtons() {
        console.log('renderButtons', this.curIdx)
        if (this.curIdx === -1 || this.model[this.curIdx].ruleType === 'Fallback') {
            for (const el of Object.values(this.btns)) {
                el.setAttribute('disabled', 'true')
            }
            this.btns.add.removeAttribute('disabled')
            return
        }
        // if any rule selected
        if (this.model.length <= 1) { return }
        for (const el of Object.values(this.btns)) {
            el.removeAttribute('disabled')
        }
        const isFirst = this.curIdx === 0
        const isLast = this.curIdx === this.model.length - 2
        if (isFirst) {
            this.btns.moveUp.setAttribute('disabled', 'true')
            this.btns.moveTop.setAttribute('disabled', 'true')
        } else if (isLast) {
            this.btns.moveDown.setAttribute('disabled', 'true')
            this.btns.moveBottom.setAttribute('disabled', 'true')
        }
    }
    private buildButtons() {
        console.log('build buttons ==>', this.btns)
        this.btns.add.onclick = () => this.actAdd()
        this.btns.del.onclick = () => this.actDel()
        this.btns.moveTop.onclick = () => this.actMoveTop()
        this.btns.moveUp.onclick = () => this.actMoveUp()
        this.btns.moveDown.onclick = () => this.actMoveDown()
        this.btns.moveBottom.onclick = () => this.actMoveBottom()
    }
    private emitChanges() {
        this.onchange(this.model)
    }
    private actAdd() {
        console.log('[button] clicked on add')
        this.model.unshift({
            ruleType: 'TagCategory',
            tagCategory: 'artist',
        })
        this.createRuleTr(this.model[0], 'prepend')
        this.curIdx = 0
        this.emitChanges()
    }
    private actDel() {
        console.log('[button] clicked on del')
        this.tbodyRef.children.item(this.curIdx)!.remove()
        this.model.splice(this.curIdx, 1)
        this.curIdx = -1
        this.emitChanges()
    }
    private actMoveTop () {
        if (this.curIdx === -1) { return }
        const tmp = this.model[this.curIdx]
        this.model.splice(this.curIdx, 1)
        this.model.unshift(tmp)
        const el = this.tbodyRef.children.item(this.curIdx)!
        this.tbodyRef.prepend(el)
        this.curIdx = 0
        this.emitChanges()
    }
    private actMoveUp () {
        if (this.curIdx === -1) { return }
        swap(this.model, this.curIdx, this.curIdx - 1)
        const el = this.tbodyRef.children.item(this.curIdx)!
        el.previousElementSibling!.before(el)
        this.curIdx--
        this.emitChanges()
    }
    private actMoveDown () {
        if (this.curIdx === -1) { return }
        swap(this.model, this.curIdx, this.curIdx+1)
        const el = this.tbodyRef.children.item(this.curIdx)!
        el.nextElementSibling!.after(el)
        this.curIdx++
        this.emitChanges()
    }
    private actMoveBottom () {
        const tmp = this.model[this.curIdx]
        if (this.curIdx === -1) { return }
        this.model.splice(this.curIdx, 1)
        this.model.splice(this.model.length - 1, 0, tmp)
        const el = this.tbodyRef.children.item(this.curIdx)!
        this.tbodyRef.lastElementChild!.before(el)
        this.curIdx = this.model.length - 2
        this.emitChanges()
    }
    private buildTable() {
        console.log('buildTable()')
        this.tbodyRef.innerHTML = ''
        for (const rule of this.model) {
            this.createRuleTr(rule, 'append')
        }
        this.rerender()
    }
    private createRuleTr(rule: FolderClassifyRule, pos: 'append' | 'prepend') {
        const tr = document.createElement('tr')
        tr.onclick = () => this.selectRule(rule)
        tr.classList.add('ruleRow')
        tr.appendChild(elHelper.mkelTd(elHelper.mkelRuleTypeSelect(rule.ruleType, (nv) => {
            rule.ruleType = nv
            this.renderRuleTrParameters(tr, rule)
        })))
        this.renderRuleTrParameters(tr, rule)
        if (pos === 'prepend') {
            this.tbodyRef.prepend(tr)
        } else {
            this.tbodyRef.appendChild(tr)
        }
    }

    private renderRuleTrParameters(tr: HTMLTableRowElement, rule: FolderClassifyRule) {
        while (tr.childElementCount > 1) {
            tr.lastElementChild!.remove()
        }
        switch (rule.ruleType) {
            case 'CustomTagMatcher': {
                objectShaper<any, typeof rule>(rule, { ruleType: 'CustomTagMatcher', folderName: '', ifContainsTag: [], logicGate: 'OR' })
                const tmp = elHelper.mkelTd(
                    elHelper.mkelRuleLogicGateSelect(rule.logicGate, (nv) => { rule.logicGate = nv }),
                    elHelper.mkelRuleCustomTagInput(rule.ifContainsTag, (nv) => { rule.ifContainsTag = nv })
                )
                tmp.style.display = 'flex'
                tr.appendChild(tmp);
                tr.appendChild(elHelper.mkelTd(
                    elHelper.mkelRuleDirNameInput(rule.folderName, (nv) => { rule.folderName = nv })
                ))
                break
            }
            case 'TagCategory': {
                objectShaper<any, typeof rule>(rule, { ruleType: 'TagCategory', tagCategory: 'artist' })
                tr.appendChild(elHelper.mkelTd(
                    elHelper.mkelRuleTagCategoriesSelect(rule.tagCategory, (nv) => { rule.tagCategory = nv })
                ))
                tr.appendChild(elHelper.mkelTd(elHelper.mkelTextContent('span', 'N/A')))
                break
            }
            case 'Fallback': {
                objectShaper<any, typeof rule>(rule, { ruleType: 'Fallback', folderName: '' })
                tr.appendChild(elHelper.mkelTd(elHelper.mkelTextContent('span', 'N/A')))
                tr.appendChild(elHelper.mkelTd(
                    elHelper.mkelRuleDirNameInput(rule.folderName, (nv) => { rule.folderName = nv })
                ))
            }
        }
    }
}

var rth = new RuleTableHandler()
rth.onchange = (newVal) => {
    saveFormToLocalStorage()
}

async function loadFromLocalStorage() {
    const d = await storageManager.getData()
    setCheckboxValue('#ui_openLinkWithNewTab', d.ui.openLinkWithNewTab)
    setCheckboxValue('#ui_buttonForCloseTab', d.ui.buttonForCloseTab)
    setTextAreaValue('#fileName_fileNameMaxCharacterLength', d.fileName.fileNameMaxCharacterLength+'')
    setTextAreaValue('#fileName_fileNameTemplate', d.fileName.fileNameTemplate)
    setSelectValue('#fileName_tagSeparator', d.fileName.tagSeparator)
    setSelectValue('#folder_downloadFolderName', d.folder.downloadFolderName)
    rth.setModel(d.folder.classifyRules)
}

async function resetToDefault() {
    storageManager.setDataPartially(storageManager.getDefaultData())
    await loadFromLocalStorage()
}
q<HTMLButtonElement>('#resetBtn').onclick=resetToDefault

async function saveFormToLocalStorage() {
    storageManager.setDataPartially({
        ui: {
            openLinkWithNewTab: getCheckboxValue('#ui_openLinkWithNewTab'),
            buttonForCloseTab: getCheckboxValue('#ui_buttonForCloseTab'),
        },
        fileName: {
            fileNameMaxCharacterLength: ~~getTextAreaValue('#fileName_fileNameMaxCharacterLength'),
            fileNameTemplate: getTextAreaValue('#fileName_fileNameTemplate'),
            tagSeparator: getSelectValue('#fileName_tagSeparator') as any,
        },
        folder: {
            downloadFolderName: getTextAreaValue('#folder_downloadFolderName'),
            enableClassify: getCheckboxValue('#folder_enableClassify'),
            classifyRules: rth.model
        }
    })
}

function handleVisibilityOfTable() {
    if (getCheckboxValue('#folder_enableClassify')) {
        q('#classifyRuleTableContainer').style.display = 'unset'
    } else {
        q('#classifyRuleTableContainer').style.display = 'none'
    }
}

function watchForm() {
    const form = document.querySelector('form')!
    handleVisibilityOfTable()
    form.addEventListener('change', (ev) => {
        console.log('form.change', ev)
        handleVisibilityOfTable()
        saveFormToLocalStorage()
    })
}

function preprocessDOM() {
    const container = q('#availableTokensContainer')
    for (const [k, doc] of Object.entries(FilenameTemplateTokenDict)) {
        const val = `%${k}%`
        const el = document.createElement('button')
        el.className = 'availableFilenameToken'
        el.textContent = val
        el.onclick = () => navigator.clipboard.writeText(val)
        tippy(el, { allowHTML: true, content: doc + '<br/><br/>Click to copy to clipboard.' })
        container.append(el)
    }
}
async function main() {
    preprocessDOM()
    await loadFromLocalStorage()
    watchForm()
}

main()