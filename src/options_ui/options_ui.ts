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

import { options_ui_input_id_t, storageManager } from "../options"


function q<T extends HTMLElement, U extends string = string>(elementId: U): T {
    const el = document.getElementById(elementId)
    if (!el) { throw new TypeError(`[To Developer] The element id ${elementId} is not found`) }
    return el as T
}

function getSelectValue(id: string): string {
    return q<HTMLSelectElement>(id).value
}
function setSelectValue(id: string, value: string) {
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
function getCheckboxValue<T extends options_ui_input_id_t>(id: T): boolean {
    return q<HTMLInputElement>(id).checked
}
function setCheckboxValue<T extends options_ui_input_id_t>(id: T, checked: boolean) {
    q<HTMLInputElement>(id).checked = checked
}
function getTextAreaValue<T extends options_ui_input_id_t>(id: T): string {
    return q<HTMLTextAreaElement>(id).value
}
function setTextAreaValue<T extends options_ui_input_id_t>(id: T, value: string) {
    q<HTMLTextAreaElement>(id).value = value
}
function setContentEditableValue<T extends options_ui_input_id_t>(id: T, value: string) {
    q<HTMLDivElement>(id).innerText =value
}

async function loadFromLocalStorage() {
    const d = await storageManager.getData()
    setCheckboxValue('ui_openLinkWithNewTab', d.ui.openLinkWithNewTab)
    setCheckboxValue('ui_buttonForCloseTab', d.ui.buttonForCloseTab)
}

async function resetToDefault() {
    storageManager.setDataPartially(storageManager.getDefaultData())
    await loadFromLocalStorage()
}
q<HTMLButtonElement>('resetBtn').onclick=resetToDefault

async function saveFormToLocalStorage() {
    storageManager.setDataPartially({
        ui: {
            openLinkWithNewTab: getCheckboxValue('ui_openLinkWithNewTab'),
            buttonForCloseTab: getCheckboxValue('ui_buttonForCloseTab'),
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
//     const input = q<HTMLInputElement, options_ui_input_id_t>('fileName_fileNameMaxCharacterLength')
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