import { ALL_OPTIONS_TAG_CATEGORY, ALL_TAG_CATEGORY, tag_category_t } from "../common"
import { ALL_RULE_TYPE, logic_gate_t, rule_type_t } from "../options"


export function mkelTextContent<K extends keyof HTMLElementTagNameMap>(tagName: K, textContent: string): HTMLElementTagNameMap[K] {
    const el = document.createElement(tagName)
    el.textContent = textContent
    return el
}
export function mkelTd(...children: HTMLElement[]): HTMLTableCellElement {
    const td = document.createElement('td')
    children.forEach(x => td.append(x))
    return td
}
export function mkelRuleCustomTagInput(modelValue: string[], changeCb: (nv: string[]) => void): HTMLInputElement {
    const input = document.createElement('input')
    input.value = modelValue.join(' ')
    input.onchange = () => { changeCb(input.value.split(' ')) }
    return input
}
export function mkelRuleDirNameInput(modelValue: string, changeCb: (nv: string) => void): HTMLInputElement {
    const input = document.createElement('input')
    input.value = modelValue
    input.onchange = () => { changeCb(input.value) }
    return input
}
export function mkelRuleTypeSelect(modelValue: rule_type_t, changeCb: (nv: rule_type_t) => void): HTMLSelectElement {
    const selectEl = document.createElement('select')
    for (const x of ALL_RULE_TYPE) {
        const opt = document.createElement('option')
        opt.value = x.value
        opt.textContent = x.label
        selectEl.add(opt)
    }
    selectEl.value = modelValue
    selectEl.onchange = () => { changeCb(selectEl.value as any) }
    return selectEl
}
export function mkelRuleTagCategoriesSelect(modelValue: tag_category_t, changeCb: (nv: tag_category_t) => void): HTMLSelectElement {
    const selectEl = document.createElement('select')
    for (const x of ALL_OPTIONS_TAG_CATEGORY) {
        const opt = document.createElement('option')
        opt.value = x
        opt.textContent = x
        selectEl.add(opt)
    }
    selectEl.value = modelValue
    selectEl.onchange = () => { changeCb(selectEl.value as any) }
    return selectEl
}
export function mkelRuleLogicGateSelect(modelValue: logic_gate_t, changeCb: (nv: logic_gate_t) => void): HTMLSelectElement {
    const selectEl = document.createElement('select')
    for (const x of ['AND', 'OR']) {
        const opt = document.createElement('option')
        opt.value = x
        opt.textContent = x
        selectEl.add(opt)
    }
    selectEl.value = modelValue
    selectEl.onchange = () => { changeCb(selectEl.value as any) }
    return selectEl
}