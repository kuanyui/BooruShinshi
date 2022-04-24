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

setupI18n()