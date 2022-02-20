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

import { storageManager } from "../options"


function q<T extends HTMLElement>(elementId: string): T {
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
function getCheckboxValue(id: string): boolean {
    return q<HTMLInputElement>(id).checked
}
function setCheckboxValue(id: string, checked: boolean) {
    q<HTMLInputElement>(id).checked = checked
}
function getTextAreaValue(id: string): string {
    return q<HTMLTextAreaElement>(id).value
}
function setTextAreaValue(id: string, value: string) {
    q<HTMLTextAreaElement>(id).value = value
}
function setContentEditableValue(id: string, value: string) {
    q<HTMLDivElement>(id).innerText =value
}

async function loadFromLocalStorage() {
    const d = await storageManager.getData()
    setCheckboxValue('openLinkWithNewTab', d.openLinkWithNewTab)
    setCheckboxValue('buttonForCloseTab', d.buttonForCloseTab)
}

async function resetToDefault() {
    storageManager.setDataPartially(storageManager.getDefaultData())
    await loadFromLocalStorage()
}
q<HTMLButtonElement>('resetBtn').onclick=resetToDefault

async function saveFormToLocalStorage() {
    storageManager.setDataPartially({
        openLinkWithNewTab: getCheckboxValue('openLinkWithNewTab'),
        buttonForCloseTab: getCheckboxValue('buttonForCloseTab'),
    })
}


function watchForm() {
    const form = document.querySelector('form')!
    form.addEventListener('change', (ev) => {
        console.log(ev)
        saveFormToLocalStorage()
    })
}
async function main() {
    await loadFromLocalStorage()
    watchForm()
}

main()