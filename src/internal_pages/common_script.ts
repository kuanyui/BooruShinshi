import { storageManager } from "../options"

const ALL_LANG = ['en', 'ja', 'zh'] as const
type lang_id_t = typeof ALL_LANG[number]

function getLangId(): lang_id_t {
    const langId = navigator.language.split('-')[0]  // en, ja, zh
    switch (langId) {
        case 'ja':
        case 'zh':
        return langId
        default:
        return 'en'
    }
}
function setupI18n() {
    const langId = getLangId()
    document.querySelectorAll('.i18nArea').forEach(el => {
        if (el.getAttribute('lang') !== langId) {
            el.remove()
        }
    })
}

// The releases of 0.12.x should always show this warning.
if (!browser.runtime.getManifest().version.startsWith('0.12.')) {
    const els = document.querySelectorAll('.syncLocalStorageMigrationWithin_0_12_x_Warning')
    for (const _el of els) {
        const el = _el as HTMLElement
        el.style.display = 'none'
    }
}

document.querySelectorAll('.openOptionsUi').forEach((el) => {
    el.addEventListener('click', (event) => {
        event.preventDefault()
        browser.runtime.openOptionsPage()
    })
})

setupI18n()

storageManager.getSync('statistics_downloadCount').then((count) => {
    const els = document.querySelectorAll('.downloadCount')
    for (const _el of els) {
        const el = _el as HTMLElement
        el.innerText = count.toString()
    }
})