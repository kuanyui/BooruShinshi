import { ALL_OPTIONS_TAG_CATEGORY, ALL_TAG_CATEGORY, tag_category_t } from "../common"
import { ALL_LOGIC_GATE, ALL_RULE_TYPE, logic_gate_t, rule_type_t } from "../options"
import tippy from 'tippy.js'
import 'tippy.js/dist/tippy.css'



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
    input.onchange = () => {
        input.value = input.value.trim().replace(/  +/g, ' ')  // remove duplicated spaces
        changeCb(input.value.split(' '))
    }
    input.placeholder = "(Tags list separated by space)"
    tippy(input, {
        allowHTML: true,
        content: `Please input tags separated by space. Example: <code>hayasaka_ai maid highres</code>. <br/><br/>
        Star symbol <code>*</code> is available. For example, <code>the_witcher*</code> can match <code>the_witcher</code>, <code>the_witcher_(series)</code>, <code>the_witcher_3_(hearts_of_stone)</code>...etc. <br/><br/>
        Notice that if left empty, this rule will be ignored.
        `
    })
    input.required = true
    input.style.minWidth = '0px'
    input.style.width = '100%'
    return input
}
export function mkelRuleDirNameInput(modelValue: string, changeCb: (nv: string) => void): HTMLInputElement {
    const input = document.createElement('input')
    input.value = modelValue
    input.onchange = () => {
        input.value = input.value.trim()
        changeCb(input.value)
    }
    input.style.minWidth = '0px'
    input.style.width = '150px'
    input.placeholder = '(Optional)'
    tippy(input, {
        allowHTML: true,
        content: `Empty means saved in root folder.<br/><br/>
     You can use relative path like <code>the_witcher/shani</code>, it will automatically create children folders if need. <br/><br/>
     But <code>../</code> is not allowed due to security restriction of browser.` })
    return input
}
export function mkelRuleTypeSelect(modelValue: rule_type_t, changeCb: (nv: rule_type_t) => void): HTMLSelectElement {
    const selectEl = document.createElement('select')
    const docs = '<ul>' + ALL_RULE_TYPE.map(x => `<li><code>${x.label}</code>: ${x.doc}</li>`).join('\n') + '</ul>'
    tippy(selectEl, { allowHTML: true, content: docs })
    for (const x of ALL_RULE_TYPE) {
        const opt = document.createElement('option')
        opt.value = x.value
        opt.textContent = x.label
        console.log('===>', x.value)
        if (x.value === 'Fallback') {
            opt.disabled = true
        }
        selectEl.add(opt)
    }
    if (modelValue === 'Fallback') {
        selectEl.disabled = true
    }
    selectEl.style.width = '70px'
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
    selectEl.style.width = '90px'
    selectEl.value = modelValue
    selectEl.onchange = () => { changeCb(selectEl.value as any) }
    return selectEl
}
export function mkelRuleLogicGateSelect(modelValue: logic_gate_t, changeCb: (nv: logic_gate_t) => void): HTMLSelectElement {
    const selectEl = document.createElement('select')
    const docs = '<ul>' + ALL_LOGIC_GATE.map(x => `<li><code>${x.label}</code>: ${x.doc}</li>`).join('\n') + '</ul>'
    tippy(selectEl, { allowHTML: true, content: docs })
    for (const x of ALL_LOGIC_GATE) {
        const opt = document.createElement('option')
        opt.value = x.value
        opt.textContent = x.label
        selectEl.add(opt)
    }
    selectEl.style.width = '60px'
    selectEl.value = modelValue
    selectEl.onchange = () => { changeCb(selectEl.value as any) }
    return selectEl
}
