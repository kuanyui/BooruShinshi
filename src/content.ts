import { MyMsg } from "./common";

browser.runtime.onMessage.addListener((_ev: any) => {
    const ev = _ev as MyMsg
    if (ev.type === "AskTabToDownload") {
        const res: MyMsg = { type: "Success" }
        console.log('send to background~', res)
        return Promise.resolve(res)
    }
})
