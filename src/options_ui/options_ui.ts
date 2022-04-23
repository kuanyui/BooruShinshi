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
import { ALL_RULE_TYPE, FolderClassifyRule, FolderClassifyRule__custom, options_ui_input_query_t, rule_type_t, storageManager } from "../options"
import * as elHelper from './components'



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
    private selectedIndex: rule_index_t = -1
    private tbodyRef = q<HTMLTableSectionElement>('#classifyRuleTableContainer table tbody')!
    public model: FolderClassifyRule[] = []
    private btns = {
        enableEngine: q<HTMLButtonElement>('.actBtn.add'),
        disableEngine: q<HTMLButtonElement>('.actBtn.delete'),
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
    public setModel(newArr: FolderClassifyRule[]) {
        console.log('setModel', newArr)
        this.model = newArr
        this.buildTable()
    }
    private selectRuleByIndex(index: rule_index_t) {
        this.selectedIndex = this.selectedIndex === index ? -1 : index
    }
    private rerender() {
        this.renderTable()
        this.renderButtons()
    }
    private renderTable() {
        const allRows = document.querySelectorAll('tr.engineRow')
        allRows.forEach(x => x.classList.remove('active'))
        if (this.selectedIndex) {
            for (const x of allRows) {
                const value = ~~(x.getAttribute('value') || 0)
                if (value === this.selectedIndex) {
                    x.classList.add('active')
                    return
                }
            }
        }
    }
    private renderButtons() {
        if (this.selectedIndex === -1) {
            qs<HTMLButtonElement>('.actBtn').forEach(x => x.setAttribute('disabled', 'true'))
        } else {
            const selectedIdIsEnabled = this.model.includes(this.selectedIndex as any)
            if (selectedIdIsEnabled) {
                qs<HTMLButtonElement>('.actBtn').forEach(x => x.removeAttribute('disabled'))
                this.btns.enableEngine.setAttribute('disabled', 'true')
                const isFirst = this.selectedIndex === 0
                const isLast = this.selectedIndex === this.model.length - 1
                if (isFirst) {
                    this.btns.moveUp.setAttribute('disabled', 'true')
                    this.btns.moveTop.setAttribute('disabled', 'true')
                } else if (isLast) {
                    this.btns.moveDown.setAttribute('disabled', 'true')
                    this.btns.moveBottom.setAttribute('disabled', 'true')
                }
            } else {
                qs<HTMLButtonElement>('.actBtn').forEach(x => x.setAttribute('disabled', 'true'))
                this.btns.enableEngine.removeAttribute('disabled')
            }
        }
    }
    private buildButtons() {
        this.btns.enableEngine.onclick = () => this.actEnableEngine()
        this.btns.disableEngine.onclick = () => this.actDisableEngine()
        this.btns.moveTop.onclick = () => this.actMoveTop()
        this.btns.moveUp.onclick = () => this.actMoveUp()
        this.btns.moveDown.onclick = () => this.actMoveDown()
        this.btns.moveBottom.onclick = () => this.actMoveBottom()
    }
    private emitChanges() {
        this.onchange(this.model)
    }
    private actEnableEngine() {
        console.log('[button] clicked on enableEngine')
        if (this.selectedIndex === -1) { return }
        this.model.push({
            ruleType: 'TagCategory',
            tagCategory: 'artist',
        })
        this.buildTable()
        this.emitChanges()
    }
    private actDisableEngine() {
        console.log('[button] clicked on enableEngine')
        if (this.selectedIndex === -1) { return }
        this.model.splice(this.selectedIndex, 1)
        this.buildTable()
        this.emitChanges()
    }
    private actMoveTop () {
        if (this.selectedIndex === -1) { return }
        const tmp = this.model[this.selectedIndex]
        this.model.splice(this.selectedIndex, 1)
        this.model.unshift(tmp)
        this.buildTable()
        this.emitChanges()
    }
    private actMoveUp () {
        if (this.selectedIndex === -1) { return }
        swap(this.model, this.selectedIndex, this.selectedIndex-1)
        this.buildTable()
        this.emitChanges()
    }
    private actMoveDown () {
        if (this.selectedIndex === -1) { return }
        swap(this.model, this.selectedIndex, this.selectedIndex+1)
        this.buildTable()
        this.emitChanges()
    }
    private actMoveBottom () {
        const tmp = this.model[this.selectedIndex]
        if (this.selectedIndex === -1) { return }
        this.model.splice(this.selectedIndex, 1)
        this.model.push(tmp)
        this.buildTable()
        this.emitChanges()
    }
    private buildTable() {
        console.log('buildTable()')
        this.tbodyRef.innerHTML = ''
        for (const rule of this.model) {
            this.initTr(rule)
        }
        this.rerender()
    }
    private initTr(rule: FolderClassifyRule) {
        const tr = document.createElement('tr')
        tr.onclick = () => this.selectRuleByIndex(this.model.indexOf(rule))
        tr.classList.add('ruleRow')
        tr.appendChild(elHelper.mkelTd(elHelper.mkelRuleTypeSelect(rule.ruleType, (nv) => {
            rule.ruleType = nv
            this.renderTrParameters(tr, rule)
        })))
        this.renderTrParameters(tr, rule)
        this.tbodyRef.appendChild(tr)
    }
    private renderTrParameters(tr: HTMLTableRowElement, rule: FolderClassifyRule) {
        while (tr.childElementCount > 1) {
            tr.lastElementChild!.remove()
        }
        switch (rule.ruleType) {
            case 'CustomTagMatcher': {
                objectShaper<any, typeof rule>(rule, { ruleType: 'CustomTagMatcher', folderName: '',ifContainsTag: [], logicGate: 'OR' })
                tr.appendChild(elHelper.mkelTd(
                    elHelper.mkelRuleLogicGateSelect(rule.logicGate, (nv) => { rule.logicGate = nv }),
                    elHelper.mkelRuleCustomTagInput(rule.ifContainsTag, (nv) => { rule.ifContainsTag = nv })
                ))
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


// function validateInput(el: HTMLInputElement) {
//     switch (el.type) {
//         case 'number': {
//             if (el.value === '') { el.value = el.min; return }
//             if(parseInt(el.value) < parseInt(el.min)) { el.value = el.min; return }
//             if(parseInt(el.value) > parseInt(el.max)) { el.value = el.max; return }
//         }
//         case 'text': {
//             if(parseInt(el.value) < el.minLength) { el.value ; return }
//             if(parseInt(el.value) > el.maxLength) { el.value = el.value.slice(0, el.maxLength) ; return }
//         }
//     }
// }
// function setupValidator() {
//     const input = q<HTMLInputElement, options_ui_input_query_t>('fileName_fileNameMaxCharacterLength')
//     input.onblur = () => { validateInput(input) }
// }

function watchForm() {
    const form = document.querySelector('form')!
    form.addEventListener('change', (ev) => {
        console.log('form.change', ev)
        saveFormToLocalStorage()
    })
}
async function main() {
    await loadFromLocalStorage()
    watchForm()
}

main()