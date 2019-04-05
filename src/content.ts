import { TypedMsg, TypedMsg_R_String, isUrlSupported, getEngineObjOfUrl } from "./common";

browser.runtime.onMessage.addListener((_ev: any) => {
    const ev = _ev as TypedMsg
    if (ev.type === 'askQueryString') {
        const res: TypedMsg_R_String = { d: getQueryStringFromDom() }
        console.log('send to background~', res)
        return Promise.resolve(res)
    }
})

function getQueryStringFromDom (): string {
    const engine = getEngineObjOfUrl(document.location.href)
    if (!engine) { return 'ERROR: Not supported search engine' }
    switch (engine.id) {
        case 'startpage': {
            const el = document.querySelector("#query") as HTMLInputElement
            if (!el) {return "ERROR: StartPage has changed its HTML structure, please open an issue on BooruDownloader's Github"}
            return el.value
        }
    }
    return "ERROR: Not handled. Please open an issue on BooruDownloader's Github"
}