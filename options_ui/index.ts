import { storageManager } from "../src/options"


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
function getContentEditableValue(id: string): string {
    let node = q<HTMLDivElement>(id)
    const plaintext = nodeToText(node)
    return plaintext
}
function setContentEditableValue(id: string, value: string) {
    q<HTMLDivElement>(id).innerText =value
}

/**
 * Yet another workaround for the fucking stupid DOM API.
 * For Firefox only. Not tested on Chromium.
 */
function nodeToText(node: Node): string {
    let str = ''
    for (let i = 0; i < node.childNodes.length; i++) {
        const child = node.childNodes[i]
        if (child.nodeType === Node.TEXT_NODE) {
            str += child.textContent
            continue
        } else if (child.nodeName === 'BR') {
            if (i !== node.childNodes.length - 1) {
                str += '\n'
            }
            continue
        } else if (child.nodeType === Node.ELEMENT_NODE) {
            str += nodeToText(child)
            if (child.nodeName === 'DIV') {
                str += '\n'
            }
            continue
        }
    }
    return str
}


async function loadFromLocalStorage() {
    const d = await storageManager.getData()
    setSelectValue('listIndentSize', d.listIndentSize + '')
    setSelectValue('ulBulletChar', d.ulBulletChar)
    setSelectValue('olBulletChar', d.olBulletChar)
    setSelectValue('codeChar', d.codeChar)
    setRadioValue('codeBlockStyle', d.codeBlockStyle)
    setCheckboxValue('insertReferenceLink_enabled', d.insertReferenceLink.enabled)
    setSelectValue('insertReferenceLink_pos', d.insertReferenceLink.pos)
    setContentEditableValue('insertReferenceLink_format', d.insertReferenceLink.format)
    setRadioValue('notificationMethod', d.notificationMethod)
    setCheckboxValue('decodeUri', d.decodeUri)
}

async function resetToDefault() {
    storageManager.setDataPartially(storageManager.getDefaultData())
    await loadFromLocalStorage()
}
q<HTMLButtonElement>('resetBtn').onclick=resetToDefault

async function saveFormToLocalStorage() {
    storageManager.setDataPartially({
        listIndentSize: ~~getSelectValue('listIndentSize'),
        ulBulletChar: getSelectValue('ulBulletChar') as any,
        olBulletChar: getSelectValue('olBulletChar') as any,
        codeChar: getSelectValue('codeChar') as any,
        codeBlockStyle: getRadioValue('codeBlockStyle') as any,
        insertReferenceLink: {
            enabled: getCheckboxValue('insertReferenceLink_enabled'),
            pos: getSelectValue('insertReferenceLink_pos') as any,
            format: getContentEditableValue('insertReferenceLink_format') as any,
        },
        notificationMethod: getRadioValue('notificationMethod') as any,
        decodeUri: getCheckboxValue('decodeUri'),
    })
}
